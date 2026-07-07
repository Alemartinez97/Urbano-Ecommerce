import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { BookingEntity, BookingStatus } from '../../infrastructure/adapters/persistence/booking.entity';

@Injectable()
export class MatchmakerService {
  private readonly logger = new Logger(MatchmakerService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly httpService: HttpService,
    @Inject('ORDER_EVENT_BUS')
    private readonly eventBus: ClientProxy,
  ) {}

  // Inicia el loop de matching secuencial estilo Uber
  async startMatchmaking(bookingId: string, timeoutMs = 15000): Promise<void> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.PENDING) {
      this.logger.warn(`Reserva ${bookingId} no encontrada o no está en estado PENDIENTE`);
      return;
    }

    const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
    const usersUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3002';

    let category = '';
    try {
      const serviceRes = await firstValueFrom(
        this.httpService.get(`${catalogUrl}/api/v1/services/${booking.serviceId}`)
      );
      category = serviceRes.data.category;
    } catch (err) {
      this.logger.error(`No se pudo obtener la categoría para el servicio ${booking.serviceId}: ${err.message}`);
      return;
    }

    // 1. Obtener la lista de proveedores activos geocercanos ordenados por distancia
    let providers: { userId: string; distanceKm: number }[] = [];
    try {
      const providersRes = await firstValueFrom(
        this.httpService.get(`${usersUrl}/api/v1/providers/active-list`, {
          params: {
            category,
            latitude: booking.latitude,
            longitude: booking.longitude,
            radiusKm: 10, // 10 km geocerca por defecto
          },
        })
      );
      providers = providersRes.data ?? [];
    } catch (err) {
      this.logger.error(`No se pudo consultar la lista de proveedores activos: ${err.message}`);
    }

    if (providers.length === 0) {
      this.logger.warn(`No hay proveedores disponibles para el matching del pedido ${bookingId}. Cancelando.`);
      booking.status = BookingStatus.CANCELLED;
      await this.bookingRepository.save(booking);
      this.eventBus.emit('booking_match_failed', { bookingId });
      return;
    }

    // 2. Iterar secuencialmente (Dispatch Loop de Uber)
    for (const provider of providers) {
      this.logger.log(`Intentando emparejar reserva ${bookingId} con proveedor ${provider.userId} (distancia: ${provider.distanceKm} km)`);
      
      // Emitir el ping de solicitud de trabajo
      this.eventBus.emit('provider_ping', {
        bookingId,
        providerId: provider.userId,
        price: booking.totalAmount,
        distanceKm: provider.distanceKm,
        location: booking.location,
      });

      // Esperar a que acepte o se cumpla el timeout
      const accepted = await this.waitForAcceptance(bookingId, timeoutMs);
      if (accepted) {
        this.logger.log(`¡Reserva ${bookingId} aceptada con éxito por proveedor ${provider.userId}!`);
        return;
      }

      this.logger.warn(`Proveedor ${provider.userId} rechazó o expiró la oferta de la reserva ${bookingId}. Intentando siguiente...`);
    }

    // Si nadie aceptó: cancelar reserva
    this.logger.error(`Ningún proveedor aceptó la reserva ${bookingId} después del loop. Cancelando.`);
    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepository.save(booking);
    this.eventBus.emit('booking_match_failed', { bookingId });
  }

  private async waitForAcceptance(bookingId: string, timeoutMs: number): Promise<boolean> {
    const checkInterval = 50; // Consultar DB cada 50ms para que sea rápido en tests
    const iterations = Math.ceil(timeoutMs / checkInterval);

    for (let i = 0; i < iterations; i++) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      const current = await this.bookingRepository.findOne({ where: { id: bookingId } });
      if (!current) return false;
      if (current.status === BookingStatus.CONFIRMED) {
        return true;
      }
    }
    return false;
  }
}
