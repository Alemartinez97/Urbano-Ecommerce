import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ProductEntity } from '../persistence/product.entity';
import { ProductController } from '../controllers/product.controller';
import { HealthController } from '../controllers/health.controller';
import { ProductService } from '../../application/services/product.service';
import { TypeOrmProductRepository } from '../adapters/persistence/typeorm-product.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity]),
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
        name: 'CATALOG_EVENT_BUS',
        imports: [ConfigModule],
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
  controllers: [ProductController, HealthController],
  providers: [
    ProductService,
    JwtStrategy,
    {
      provide: 'ProductRepository',
      useClass: TypeOrmProductRepository,
    },
  ],
  exports: [ProductService],
})
export class CatalogModule { }