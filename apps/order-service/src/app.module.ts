import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderModule } from './infrastructure/modules/order.module';
import { OrderEntity } from './infrastructure/adapters/persistence/order.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('ORDERS_DATABASE_URL'),
        entities: [OrderEntity],
        synchronize: true,
      }),
    }),
    OrderModule,
  ],
})
export class AppModule {}