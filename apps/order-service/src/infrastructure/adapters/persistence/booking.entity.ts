import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BookingStatus {
  PENDING = 'PENDING',       // Creada, esperando pago/confirmación
  CONFIRMED = 'CONFIRMED',   // Pago realizado, slot bloqueado
  CANCELLED = 'CANCELLED',   // Cancelada (por usuario o sistema), slot liberado
  COMPLETED = 'COMPLETED',   // Evento finalizado, listo para reseñas
}

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ID del cliente que contrata el servicio
  @Column()
  customerId: string;

  // ID del proveedor contratado
  @Column()
  providerId: string;

  // ID del servicio del catálogo
  @Column()
  serviceId: string;

  // Fechas y horas exactas del evento contratado
  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  // Monto total de la reserva
  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  // Dirección o link del evento (si es virtual o físico)
  @Column({ type: 'text', nullable: true })
  location: string;

  // Instrucciones adicionales del cliente para el proveedor
  @Column({ type: 'text', nullable: true })
  specialInstructions: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
