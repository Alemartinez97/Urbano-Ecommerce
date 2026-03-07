import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from '../../application/services/order.service';
import { OrderController } from '../controllers/order.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { OrderEntity } from '../adapters/persistence/order.entity';

@Module({
  imports: [
    // Conexión a la tabla específica de órdenes
    TypeOrmModule.forFeature([OrderEntity]),
    
    // Registro del cliente para hablar con RabbitMQ
    ClientsModule.registerAsync([
      {
        name: 'ORDER_EVENT_BUS',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('EVENT_BUS_URL') || 'amqp://event-bus:5672'],
            queue: 'inventory_queue', // Enviamos a la cola de Inventario
            queueOptions: { durable: false },
          },
        }),
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService], // Por si otro módulo interno lo necesita
})
export class OrderModule {}