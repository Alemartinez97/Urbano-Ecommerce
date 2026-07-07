import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRepository } from '../../../application/repositories/product.repository.interface';
import { EventServiceEntity } from '../../persistence/product.entity';

// Adapter de TypeORM actualizado para manejar servicios de eventos (antes era ProductEntity)
@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(EventServiceEntity)
    private readonly repository: Repository<EventServiceEntity>,
  ) {}

  async save(service: Partial<EventServiceEntity>): Promise<EventServiceEntity> {
    const entity = this.repository.create(service);
    return await this.repository.save(entity);
  }

  async findOne(id: string): Promise<EventServiceEntity | null> {
    return await this.repository.findOne({ where: { id } }) || null;
  }

  async findAll(): Promise<EventServiceEntity[]> {
    return await this.repository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
  }
}