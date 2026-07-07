import { IsString, IsNumber, Min, IsUUID, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID del proveedor contratado' })
  @IsUUID()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({ description: 'ID del servicio seleccionado' })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Fecha y hora de inicio del evento', example: '2025-01-15T20:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Fecha y hora de finalización del evento', example: '2025-01-15T23:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: 'Costo total calculado en base a tarifa fija o por hora' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ description: 'Lugar físico del evento o enlace si es virtual' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Instrucciones especiales para el proveedor', required: false })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
