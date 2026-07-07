import { Controller, Post, Get, Param, Body, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingService } from '../../application/services/booking.service';
import { CreateBookingDto } from '../../application/dtos/create-booking.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Reservas y Transacciones')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Crear una reserva (Cliente contrata Proveedor)' })
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    // req.user.userId viene del token JWT del cliente
    return await this.bookingService.createBooking(req.user.userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Ver mis reservas como cliente' })
  async getMyBookings(@Req() req: any) {
    return await this.bookingService.getMyBookings(req.user.userId);
  }

  @Get('provider/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Ver mis servicios contratados como proveedor' })
  async getProviderBookings(@Req() req: any) {
    return await this.bookingService.getProviderBookings(req.user.userId);
  }

  // En la vida real esto lo llamaría el Webhook de Stripe/MercadoPago tras cobrar
  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Confirmar pago de reserva (Bloquea el Slot)' })
  async confirmBooking(@Param('id') id: string) {
    return await this.bookingService.confirmBooking(id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Cancelar reserva (Libera el Slot)' })
  async cancelBooking(@Param('id') id: string, @Req() req: any) {
    return await this.bookingService.cancelBooking(id, req.user.userId);
  }
}
