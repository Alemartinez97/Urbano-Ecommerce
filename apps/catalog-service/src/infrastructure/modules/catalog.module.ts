import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProductEntity } from '../persistence/product.entity';
import { ProductController } from '../controllers/product.controller';
import { ProductService } from '../../application/services/product.service';
import { TypeOrmProductRepository } from '../adapters/persistence/typeorm-product.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity]),
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
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: 'ProductRepository',
      useClass: TypeOrmProductRepository,
    },
  ],
  exports: [ProductService],
})
export class CatalogModule { }