import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { BookingEntity } from '../adapters/persistence/booking.entity';
import { BookingController } from '../controllers/booking.controller';
import { OrdersController } from '../controllers/orders.controller';
import { BookingService } from '../../application/services/booking.service';
import { MatchmakerService } from '../../application/services/matchmaker.service';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity]),
    HttpModule.register({ timeout: 5000 }), // Para llamar al availability-service
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
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('EVENT_BUS_URL') || 'amqp://event-bus:5672'],
            queue: 'inventory_queue', // Mismo queue que usa el availability-service
            queueOptions: { durable: false },
          },
        }),
      },
    ]),
  ],
  controllers: [BookingController, OrdersController],
  providers: [BookingService, MatchmakerService, JwtStrategy],
  exports: [BookingService, MatchmakerService],
})
export class BookingModule {}
