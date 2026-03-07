import { Controller, Post, Body } from '@nestjs/common';
import { CreateOrderDto } from '../../application/dtos/create-order.dto';
import { OrderService } from '../../application/services/order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return await this.orderService.create(createOrderDto);
  }
}