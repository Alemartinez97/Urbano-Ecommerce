import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TimeSlotEntity } from './domain/entities/inventory.entity';
import { AvailabilityService } from './application/services/inventory.service';
import { AvailabilityController } from './infrastructure/controllers/inventory.controller';
import { HealthController } from './infrastructure/controllers/health.controller';

// Módulo raíz del availability-service (antes inventory-service)
// Responsabilidad: gestionar las franjas horarias de disponibilidad de los proveedores
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Base de datos propia: cada microservicio tiene su propia DB (Clean Architecture)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [TimeSlotEntity],
        synchronize: true, // Solo en desarrollo; en producción usar migraciones
      }),
    }),
    TypeOrmModule.forFeature([TimeSlotEntity]),
    // Event Bus: escucha eventos del order-service para bloquear/liberar slots automáticamente
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
})
export class AppModule {}