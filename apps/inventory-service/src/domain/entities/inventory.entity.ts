import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

// Estado de una franja horaria
export enum SlotStatus {
  AVAILABLE = 'AVAILABLE', // El proveedor está libre en ese bloque de tiempo
  BOOKED = 'BOOKED',       // Reservado: el bloque fue contratado por un cliente
  BLOCKED = 'BLOCKED',     // Bloqueado manualmente por el proveedor (vacaciones, descanso, etc.)
}

// Tabla de franjas horarias: el corazón del sistema de disponibilidad Uber-style
// Cada registro representa un bloque de tiempo ocupado o disponible de un proveedor
@Entity('time_slots')
@Index(['providerId', 'startTime', 'endTime']) // Índice para búsquedas rápidas de disponibilidad
export class TimeSlotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ID del proveedor al que pertenece esta franja (referencia al users-service)
  @Column()
  providerId: string;

  // ID del servicio asociado a este slot (referencia al catalog-service)
  @Column({ nullable: true })
  serviceId: string;

  // ID de la reserva que generó este bloqueo (referencia al order-service)
  @Column({ nullable: true })
  bookingId: string;

  // Inicio y fin del bloque horario (ej. 20:00 - 23:00)
  @Column({ type: 'timestamptz' }) // timestamptz conserva la zona horaria
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  // Estado actual del slot
  @Column({ type: 'enum', enum: SlotStatus, default: SlotStatus.AVAILABLE })
  status: SlotStatus;

  @CreateDateColumn()
  createdAt: Date;
}