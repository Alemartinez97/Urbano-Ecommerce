import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('provider_profiles')
export class ProviderProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación 1 a 1 con el usuario principal
  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: UserEntity;

  // Pilar 1: Categoría (CATERING, MUSIC, STAFF, etc.)
  @Column({ nullable: true })
  category: string;

  // Pilar 2: Geolocalización (Estilo Uber)
  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  // Radio de trabajo en kilómetros (ej. "Solo trabajo a 10km a la redonda")
  @Column({ type: 'float', default: 10 })
  coverageRadiusKm: number;

  // Módulo de reseñas (Promedio de 1 a 5 estrellas)
  @Column({ type: 'float', default: 5.0 })
  rating: number;

  // Cantidad total de reseñas recibidas (para calcular el promedio real después)
  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  // Biografía o descripción del proveedor
  @Column({ type: 'text', nullable: true })
  bio: string;
}
