import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { InventoryEntity } from './domain/entities/inventory.entity';
import { InventoryService } from './application/services/inventory.service';
import { InventoryController } from './infrastructure/controllers/inventory.controller';

@Module({
  imports: [
    // 1. Configuración de Variables de Entorno
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Conexión a la Base de Datos (inventory_db)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [InventoryEntity],
        synchronize: true, // Solo para desarrollo, Alejandro
      }),
    }),
    TypeOrmModule.forFeature([InventoryEntity]),

    // 3. Cliente de RabbitMQ (Para poder EMITIR eventos si fuera necesario)
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
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class AppModule {}