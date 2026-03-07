import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { OrderEntity } from '../../infrastructure/adapters/persistence/order.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @Inject('ORDER_EVENT_BUS') private readonly client: ClientProxy,
  ) {}

  async create(data: CreateOrderDto): Promise<OrderEntity> {
    const order = this.orderRepository.create({
      ...data,
      status: 'CONFIRMED',
    });
    const savedOrder = await this.orderRepository.save(order);

    // 🚀 Notificamos el evento para descontar stock
    this.client.emit('order_created', {
      orderId: savedOrder.id,
      items: savedOrder.items,
    });

    return savedOrder;
  }
}