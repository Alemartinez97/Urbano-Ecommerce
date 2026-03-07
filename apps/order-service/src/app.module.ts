import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderModule } from './infrastructure/modules/order.module';
import { OrderEntity } from './infrastructure/adapters/persistence/order.entity';

@Module({
  imports: [
    // 1. Configuraciones Globales
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Conexión a la DB del Microservicio
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('ORDERS_DATABASE_URL'),
        entities: [OrderEntity],
        synchronize: true, // Acordate de pasarlo a false en prod
      }),
    }),

    // 3. Importamos el módulo de negocio que ya tiene Controller y Service
    OrderModule,
  ],
})
export class AppModule {}