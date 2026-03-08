import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CreateOrderDto } from '../../application/dtos/create-order.dto';
import { OrderService } from '../../application/services/order.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return await this.orderService.create(createOrderDto);
  }
}