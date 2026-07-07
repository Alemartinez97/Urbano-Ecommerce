import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Tipos de precios soportados por la plataforma EventGo
export enum PricingType {
  HOURLY = 'HOURLY',         // Por hora (Mozos, DJs, Seguridad)
  FIXED = 'FIXED',           // Precio fijo por evento (Fotógrafo, Catering paquete)
  PER_PERSON = 'PER_PERSON', // Por persona (Catering)
}

// Categorías de servicios disponibles en el marketplace
export enum ServiceCategory {
  CATERING = 'CATERING',           // Comida y bebida
  MUSIC = 'MUSIC',                 // Música (DJs, bandas, grupos)
  STAFF = 'STAFF',                 // Personal (Mozos, seguridad, limpieza)
  VENUE = 'VENUE',                 // Locación/salón
  PHOTOGRAPHY = 'PHOTOGRAPHY',     // Foto y video
  DECORATION = 'DECORATION',       // Decoración
}

// Tabla principal del catálogo: Reemplaza "products" por servicios profesionales para eventos
@Entity('event_services')
export class EventServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ID del proveedor que ofrece este servicio (referencia al users-service)
  @Column()
  providerId: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  // Categoría del servicio para la búsqueda E-commerce (Comida, Música, Personal, etc.)
  @Column({ type: 'enum', enum: ServiceCategory })
  category: ServiceCategory;

  // Modelo de precio: por hora, fijo o por persona
  @Column({ type: 'enum', enum: PricingType, default: PricingType.HOURLY })
  pricingType: PricingType;

  // Precio base del servicio (el costo depende del pricingType)
  @Column('decimal', { precision: 10, scale: 2 })
  basePrice: number;

  // Tags para el buscador IA (ej: "asado, parrilla, bbq")
  @Column('simple-array', { nullable: true })
  tags: string[];

  // Rating promedio del proveedor (sincronizado desde users-service tras las reseñas)
  @Column({ type: 'float', default: 5.0 })
  rating: number;

  // El servicio aparece en las búsquedas solo si está activo
  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}