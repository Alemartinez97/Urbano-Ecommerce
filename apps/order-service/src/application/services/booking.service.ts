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
      this.logger.warn('No se pudo verificar la disponibilidad, procediendo bajo riesgo', error.message);
    }

    // 2. Crear la reserva
    const booking = this.bookingRepository.create({
      customerId,
      providerId: data.providerId,
      serviceId: data.serviceId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      totalAmount: data.totalAmount,
      location: data.location,
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
