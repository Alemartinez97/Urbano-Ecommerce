import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsDate, IsDateString, IsOptional, IsString } from 'class-validator';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AvailabilityService } from '../../application/services/inventory.service';
import { Type } from 'class-transformer';

// DTO para consultar disponibilidad rápida antes de mostrar un proveedor en el buscador
class CheckAvailabilityDto {
  @IsString()
  providerId: string;

  @IsDateString()
  @Type(() => Date)
  startTime: string;

  @IsDateString()
  @Type(() => Date)
  endTime: string;
}

// DTO para que el proveedor bloquee un rango en su agenda manualmente
class BlockSlotDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

@ApiTags('Disponibilidad Horaria (Time Slots)')
@Controller('availability')
export class AvailabilityController {
  private readonly logger = new Logger(AvailabilityController.name);

  constructor(private readonly availabilityService: AvailabilityService) {}

  // El buscador del marketplace llama a esto para verificar si un proveedor está libre
  // Ejemplo: GET /api/v1/availability/check?providerId=xxx&startTime=...&endTime=...
  @Get('check')
  @ApiOperation({ summary: 'Verificar si un proveedor está disponible en un horario' })
  @ApiQuery({ name: 'providerId', type: String })
  @ApiQuery({ name: 'startTime', type: String, description: 'ISO 8601: 2025-01-15T20:00:00Z' })
  @ApiQuery({ name: 'endTime', type: String, description: 'ISO 8601: 2025-01-15T23:00:00Z' })
  async checkAvailability(
    @Query('providerId') providerId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const available = await this.availabilityService.isAvailable(
      providerId,
      new Date(startTime), // Con @Type ya no sería necesario el new Date()
      new Date(endTime),   // Se podría pasar el DTO directamente
    );
    return { providerId, available };
  }

  // El proveedor consulta su propia agenda para ver sus compromisos
  // Ejemplo: GET /api/v1/availability/me/schedule?from=2025-01-01&to=2025-01-31
  @Get('me/schedule')
  @ApiOperation({ summary: 'Ver mi agenda (solo el proveedor autenticado)' })
  @ApiQuery({ name: 'from', type: String })
  @ApiQuery({ name: 'to', type: String })
  async mySchedule(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    return this.availabilityService.getProviderSchedule(
      req.user?.userId ?? req.query.providerId,
      new Date(from),
      new Date(to),
    );
  }

  // El proveedor bloquea un rango de tiempo en su agenda (vacaciones, descanso)
  @Post('me/block')
  @ApiOperation({ summary: 'Bloquear un rango de tiempo en mi agenda' })
  async blockSlot(@Body() dto: BlockSlotDto, @Req() req: any) {
    return this.availabilityService.blockSlot(
      req.user?.userId ?? 'test-provider',
      new Date(dto.startTime),
      new Date(dto.endTime),
    );
  }

  // Endpoint interno: el order-service llama a esto cuando una reserva es confirmada
  @Post('internal/book')
  @ApiOperation({ summary: '[INTERNO] Bloquear slot al confirmar una reserva' })
  async bookSlot(@Body() data: { providerId: string; serviceId: string; bookingId: string; startTime: string; endTime: string }) {
    return this.availabilityService.bookSlot({
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    });
  }

  // Endpoint interno: el order-service llama a esto cuando una reserva es cancelada
  @Delete('internal/release/:bookingId')
  @ApiOperation({ summary: '[INTERNO] Liberar slot al cancelar una reserva' })
  async releaseSlot(@Param('bookingId') bookingId: string) {
    await this.availabilityService.releaseSlot(bookingId);
    return { message: `Slot de reserva ${bookingId} liberado correctamente` };
  }

  // ==========================================
  // EVENT BUS LISTENERS (RABBITMQ)
  // ==========================================

  @EventPattern('booking_confirmed')
  async handleBookingConfirmed(
    @Payload() data: { providerId: string; serviceId: string; bookingId: string; startTime: string; endTime: string }
  ) {
    this.logger.log(`[EventBus] Recibido booking_confirmed para reserva: ${data.bookingId}`);
    try {
      await this.availabilityService.bookSlot({
        providerId: data.providerId,
        serviceId: data.serviceId,
        bookingId: data.bookingId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      });
      this.logger.log(`[EventBus] Slot reservado exitosamente para la reserva: ${data.bookingId}`);
    } catch (error) {
      this.logger.error(`[EventBus] Error al procesar booking_confirmed para reserva ${data.bookingId}: ${error.message}`);
    }
  }

  @EventPattern('booking_cancelled')
  async handleBookingCancelled(
    @Payload() data: { bookingId: string }
  ) {
    this.logger.log(`[EventBus] Recibido booking_cancelled para reserva: ${data.bookingId}`);
    try {
      await this.availabilityService.releaseSlot(data.bookingId);
      this.logger.log(`[EventBus] Slot liberado exitosamente para la reserva: ${data.bookingId}`);
    } catch (error) {
      this.logger.error(`[EventBus] Error al procesar booking_cancelled para reserva ${data.bookingId}: ${error.message}`);
    }
  }
}