import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Not } from 'typeorm';
import { TimeSlotEntity, SlotStatus } from '../../domain/entities/inventory.entity';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @InjectRepository(TimeSlotEntity)
    private readonly slotRepo: Repository<TimeSlotEntity>,
  ) {}

  // Verifica si un proveedor tiene algún slot que se solape con el rango pedido
  // Esta es la lógica crítica: impide que un mozo acepte dos eventos al mismo tiempo
  async hasOverlap(providerId: string, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<boolean> {
    const query = this.slotRepo.createQueryBuilder('slot')
      .where('slot.providerId = :providerId', { providerId })
      .andWhere('slot.status != :status', { status: SlotStatus.AVAILABLE })
      .andWhere('slot.startTime < :endTime', { endTime })
      .andWhere('slot.endTime > :startTime', { startTime });

    // Al editar una reserva, excluimos el booking propio para no colisionar consigo mismo
    if (excludeBookingId) {
      query.andWhere('slot.bookingId != :bookingId', { bookingId: excludeBookingId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  // Consulta rápida de disponibilidad: el catalog-service llama esto antes de mostrar al proveedor
  async isAvailable(providerId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const overlap = await this.hasOverlap(providerId, startTime, endTime);
    return !overlap;
  }

  // Bloquea un slot cuando una reserva es confirmada
  // Lo llama el order-service via RabbitMQ cuando el cliente paga
  async bookSlot(data: { providerId: string; serviceId: string; bookingId: string; startTime: Date; endTime: Date }): Promise<TimeSlotEntity> {
    // Verificación final anti-colisión antes de confirmar
    const hasConflict = await this.hasOverlap(data.providerId, data.startTime, data.endTime);
    if (hasConflict) {
      throw new ConflictException(`El proveedor no está disponible en ese horario`);
    }

    const slot = this.slotRepo.create({
      providerId: data.providerId,
      serviceId: data.serviceId,
      bookingId: data.bookingId,
      startTime: data.startTime,
      endTime: data.endTime,
      status: SlotStatus.BOOKED,
    });

    this.logger.log(`Slot bloqueado: Proveedor ${data.providerId} de ${data.startTime} a ${data.endTime}`);
    return await this.slotRepo.save(slot);
  }

  // El proveedor bloquea manualmente días o franjas en su agenda (vacaciones, descanso)
  async blockSlot(providerId: string, startTime: Date, endTime: Date): Promise<TimeSlotEntity> {
    const hasConflict = await this.hasOverlap(providerId, startTime, endTime);
    if (hasConflict) {
      throw new ConflictException('Ya tienes una actividad en ese rango horario');
    }

    const slot = this.slotRepo.create({
      providerId,
      startTime,
      endTime,
      status: SlotStatus.BLOCKED,
    });
    return await this.slotRepo.save(slot);
  }

  // Libera un slot cuando una reserva es cancelada
  // El proveedor queda libre para aceptar otro evento en ese horario
  async releaseSlot(bookingId: string): Promise<void> {
    const slot = await this.slotRepo.findOne({ where: { bookingId } });
    if (slot) {
      await this.slotRepo.remove(slot);
      this.logger.log(`Slot liberado para la reserva: ${bookingId}`);
    }
  }

  // Devuelve todos los slots (ocupados y bloqueados) de un proveedor para un rango de fechas
  // El proveedor lo ve en su "agenda" del panel de gestión
  async getProviderSchedule(providerId: string, from: Date, to: Date): Promise<TimeSlotEntity[]> {
    return this.slotRepo.createQueryBuilder('slot')
      .where('slot.providerId = :providerId', { providerId })
      .andWhere('slot.startTime >= :from', { from })
      .andWhere('slot.endTime <= :to', { to })
      .orderBy('slot.startTime', 'ASC')
      .getMany();
  }
}