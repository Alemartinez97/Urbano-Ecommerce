import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../infrastructure/persistence/product.entity';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async execute(data: Partial<ProductEntity>): Promise<ProductEntity> {
    const product = this.productRepository.create(data);
    return await this.productRepository.save(product);
  }
}