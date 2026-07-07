import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PricingType, ServiceCategory } from '../../infrastructure/persistence/product.entity';

// DTO para crear un nuevo servicio en el marketplace (lo usa el proveedor desde su panel)
export class CreateEventServiceDto {
  @ApiProperty({ description: 'Nombre del servicio', example: 'DJ para fiestas' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción del servicio', example: '5 horas de música electrónica, equipo incluido' })
  @IsString()
  description: string;

  @ApiProperty({ enum: ServiceCategory, description: 'Categoría del servicio' })
  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @ApiProperty({ enum: PricingType, description: 'Tipo de precio' })
  @IsEnum(PricingType)
  pricingType: PricingType;

  @ApiProperty({ description: 'Precio base en pesos', example: 5000 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Tags para el buscador IA', example: ['dj', 'electronica', 'cumbia'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateEventServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PricingType)
  pricingType?: PricingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// DTO para el resultado del buscador (incluye disponibilidad del proveedor)
export class SearchEventServicesDto {
  @ApiProperty({ description: 'Categoría a buscar', enum: ServiceCategory, required: false })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiProperty({ description: 'Precio máximo', required: false })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({ description: 'Ordenar por precio (asc/desc)', required: false })
  @IsOptional()
  @IsString()
  sortByPrice?: 'asc' | 'desc';

  @ApiProperty({ description: 'Tags de búsqueda IA', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: 'Latitud del evento para tarifas dinámicas y geocercas', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ description: 'Longitud del evento para tarifas dinámicas y geocercas', required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ description: 'Radio de búsqueda en km', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;
}