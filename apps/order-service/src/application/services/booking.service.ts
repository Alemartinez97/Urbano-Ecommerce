import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BookingEntity, BookingStatus } from '../../infrastructure/adapters/persistence/booking.entity';
import { CreateBookingDto } from '../dtos/create-booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @Inject('ORDER_EVENT_BUS') private readonly eventBus: ClientProxy,
    private readonly httpService: HttpService,
  ) {}

  async createBooking(customerId: string, data: CreateBookingDto): Promise<BookingEntity> {
    // 1. Verificar disponibilidad con el availability-service (via HTTP)
    const availabilityUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${availabilityUrl}/api/v1/availability/check`, {
          params: {
            providerId: data.providerId,
            startTime: data.startTime,
            endTime: data.endTime,
          },
        }),
      );
      if (!response.data.available) {
        throw new ConflictException('El proveedor ya no está disponible en este horario');
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.warn('No se pudo verificar la disponibilidad, procediendo bajo riesgo: ' + error.message);
    }

    // 2. Validar tarifa dinámica en el servidor si se proveen coordenadas (Evita hackeos)
    if (data.latitude !== undefined && data.longitude !== undefined) {
      const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
      const usersUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3002';
      
      try {
        // Obtener datos del servicio del catálogo
        const serviceRes = await firstValueFrom(
          this.httpService.get(`${catalogUrl}/api/v1/services/${data.serviceId}`)
        );
        const basePrice = Number(serviceRes.data.basePrice);
        const category = serviceRes.data.category;

        // Obtener oferta
        const providersRes = await firstValueFrom(
          this.httpService.get(`${usersUrl}/api/v1/providers/active-count`, {
            params: {
              category,
              latitude: data.latitude,
              longitude: data.longitude,
              radiusKm: 10,
            },
          })
        );
        const activeProvidersCount = providersRes.data.count ?? 0;

        // Obtener demanda local
        const demandCount = await this.getActiveBookingsCount(category, data.latitude, data.longitude, 10);

        // Calcular multiplicador
        let multiplier = 1.0;
        if (demandCount > activeProvidersCount) {
          const divisor = activeProvidersCount + 1;
          const diff = demandCount - activeProvidersCount;
          multiplier = 1.0 + (diff / divisor) * 0.15;
        }

        const expectedPrice = Math.round(basePrice * multiplier * 100) / 100;

        if (Math.abs(data.totalAmount - expectedPrice) > 10.0) {
          throw new ConflictException(`La tarifa enviada ($${data.totalAmount}) difiere de la tarifa dinámica oficial del servidor ($${expectedPrice})`);
        }
      } catch (err) {
        if (err instanceof ConflictException) throw err;
        this.logger.warn('Error al verificar tarifa dinámica en el servidor: ' + err.message);
      }
    }

    // 3. Crear la reserva
    const booking = this.bookingRepository.create({
      customerId,
      providerId: data.providerId,
      serviceId: data.serviceId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      totalAmount: data.totalAmount,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      specialInstructions: data.specialInstructions,
      status: BookingStatus.PENDING,
    });
    const savedBooking = await this.bookingRepository.save(booking);

    this.logger.log(`Nueva reserva creada: ${savedBooking.id} (Estado: PENDING)`);
    return savedBooking;
  }

  async getMyBookings(customerId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: { customerId },
      order: { startTime: 'DESC' },
    });
  }

  async getProviderBookings(providerId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: { providerId },
      order: { startTime: 'DESC' },
    });
  }

  // Cuenta las reservas activas (PENDING/CONFIRMED) dentro de un radio geográfico
  async getActiveBookingsCount(
    category: string,
    centerLat: number,
    centerLon: number,
    radiusKm: number,
  ): Promise<number> {
    const activeBookings = await this.bookingRepository.find({
      where: [
        { status: BookingStatus.PENDING },
        { status: BookingStatus.CONFIRMED },
      ],
    });

    const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
    let count = 0;

    for (const booking of activeBookings) {
      if (booking.latitude !== null && booking.longitude !== null && booking.latitude !== undefined && booking.longitude !== undefined) {
        // Consultar la categoría del servicio asociado a la reserva
        try {
          const serviceRes = await firstValueFrom(
            this.httpService.get(`${catalogUrl}/api/v1/services/${booking.serviceId}`)
          );
          if (serviceRes.data.category === category) {
            const distance = this.calculateDistance(
              centerLat,
              centerLon,
              booking.latitude,
              booking.longitude,
            );
            if (distance <= radiusKm) {
              count++;
            }
          }
        } catch (err) {
          this.logger.warn(`No se pudo verificar la categoría del servicio ${booking.serviceId} para la reserva ${booking.id}: ${err.message}`);
        }
      }
    }
    return count;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async confirmBooking(bookingId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    booking.status = BookingStatus.CONFIRMED;
    const updated = await this.bookingRepository.save(booking);

    // 3. Emitir evento para bloquear el Slot en availability-service
    // Nota: Estamos usando RabbitMQ para esto, pero el endpoint HTTP también existe
    this.eventBus.emit('booking_confirmed', {
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      bookingId: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });

    this.logger.log(`Reserva confirmada: ${updated.id}. Slot bloqueado emitido.`);
    return updated;
  }

  async cancelBooking(bookingId: string, userId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.customerId !== userId && booking.providerId !== userId) {
      throw new ConflictException('No tienes permisos para cancelar esta reserva');
    }

    booking.status = BookingStatus.CANCELLED;
    const updated = await this.bookingRepository.save(booking);

    // 4. Emitir evento para liberar el Slot
    this.eventBus.emit('booking_cancelled', { bookingId: booking.id });
    
    this.logger.log(`Reserva cancelada: ${updated.id}. Liberación de slot emitida.`);
    return updated;
  }
}
