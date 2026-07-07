import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TimeSlotEntity } from '../../domain/entities/inventory.entity'; // Motor de disponibilidad horaria
import { AvailabilityService } from '../../application/services/inventory.service';
import { AvailabilityController } from '../controllers/inventory.controller';
import { HealthController } from '../controllers/health.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeSlotEntity]),
    // Event Bus para recibir eventos del order-service (reserva confirmada, reserva cancelada)
    ClientsModule.registerAsync([
      {
        name: 'INVENTORY_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('EVENT_BUS_URL') || 'amqp://event-bus:5672'],
            queue: 'inventory_queue',
            queueOptions: { durable: false },
          },
        }),
      },
    ]),
  ],
  controllers: [AvailabilityController, HealthController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
