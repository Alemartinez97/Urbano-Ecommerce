import { EventServiceEntity } from '../../infrastructure/persistence/product.entity';

// Interfaz del repositorio actualizada para EventGo (antes manejaba ProductEntity)
export interface ProductRepository {
  save(service: Partial<EventServiceEntity>): Promise<EventServiceEntity>;
  findOne(id: string): Promise<EventServiceEntity | null>;
  findAll(): Promise<EventServiceEntity[]>;
}
