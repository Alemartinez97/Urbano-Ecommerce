import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { BookingService } from '../../application/services/booking.service';

@ApiTags('Pedidos (Orders)')
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly bookingService: BookingService) {}

  // Consulta cuántas reservas activas (demanda) hay dentro de la geocerca
  // GET /api/v1/orders/active-count?category=STAFF&latitude=-34.6037&longitude=-58.3816&radiusKm=10
  @Get('active-count')
  @ApiOperation({ summary: 'Obtener la cantidad de reservas activas en una geocerca' })
  @ApiQuery({ name: 'category', type: String, required: true })
  @ApiQuery({ name: 'latitude', type: Number, required: true })
  @ApiQuery({ name: 'longitude', type: Number, required: true })
  @ApiQuery({ name: 'radiusKm', type: Number, required: false, defaultValue: 10 })
  async getActiveCount(
    @Query('category') category: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radiusKm') radiusKm?: number,
  ) {
    const limitKm = radiusKm ? Number(radiusKm) : 10;
    const count = await this.bookingService.getActiveBookingsCount(
      category,
      Number(latitude),
      Number(longitude),
      limitKm,
    );
    return { count };
  }
}
