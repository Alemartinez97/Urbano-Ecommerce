import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../persistence/product.entity';
import { ProductController } from '../controllers/product.controller';
import { ProductService } from '../../application/services/product.service';
import { TypeOrmProductRepository } from '../adapters/persistence/typeorm-product.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity]),
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
export class CatalogModule {}