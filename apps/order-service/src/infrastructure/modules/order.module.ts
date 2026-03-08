import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderService } from '../../application/services/order.service';
import { OrderController } from '../controllers/order.controller';
import { HealthController } from '../controllers/health.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrderEntity } from '../adapters/persistence/order.entity';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
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
  controllers: [OrderController, HealthController],
  providers: [OrderService, JwtStrategy],
  exports: [OrderService], // Por si otro módulo interno lo necesita
})
export class OrderModule {}