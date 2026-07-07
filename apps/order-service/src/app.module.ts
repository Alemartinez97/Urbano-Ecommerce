import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BookingModule } from './infrastructure/modules/booking.module';
import { BookingEntity } from './infrastructure/adapters/persistence/booking.entity';
import { HealthController } from './infrastructure/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('ORDERS_DATABASE_URL'),
        entities: [BookingEntity],
        synchronize: true, // Automático en desarrollo
      }),
    }),
    BookingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}