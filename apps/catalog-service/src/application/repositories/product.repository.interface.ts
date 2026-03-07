import { ProductEntity } from '../../infrastructure/persistence/product.entity';

export interface ProductRepository {
  save(product: Partial<ProductEntity>): Promise<ProductEntity>;
  findOne(id: string): Promise<ProductEntity | null>;
  findAll(): Promise<ProductEntity[]>;
}
