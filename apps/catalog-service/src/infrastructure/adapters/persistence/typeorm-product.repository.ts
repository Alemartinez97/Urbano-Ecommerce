import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRepository } from '../../../application/repositories/product.repository.interface';
import { ProductEntity } from '../../persistence/product.entity';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  async save(product: Partial<ProductEntity>): Promise<ProductEntity> {
    const entity = this.repository.create(product);
    return await this.repository.save(entity);
  }

  async findOne(id: string): Promise<ProductEntity | null> {
    const product = await this.repository.findOne({ where: { id } });
    return product || null; 
  }

  async findAll(): Promise<ProductEntity[]> {
    return await this.repository.find({ 
      where: { active: true },
      order: { createdAt: 'DESC' } 
    });
  }
}