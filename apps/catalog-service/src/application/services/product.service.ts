import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../infrastructure/persistence/product.entity';
import { ClientProxy } from '@nestjs/microservices';
import { CreateProductDto, UpdateProductDto } from '../dtos/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @Inject('CATALOG_EVENT_BUS') 
    private readonly client: ClientProxy,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return await this.productRepository.find({ where: { active: true } });
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  async create(data: CreateProductDto): Promise<ProductEntity> {
    const product = this.productRepository.create(data);
    const savedProduct = await this.productRepository.save(product);
    this.client.emit('product_created', {
      id: savedProduct.id,
      name: savedProduct.name,
      initialStock: data.stock || 0
    });

    return savedProduct;
  }

  async update(id: string, data: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.productRepository.preload({...data});
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    
    const updatedProduct = await this.productRepository.save(product);
    this.client.emit('product_updated', {
      id: updatedProduct.id,
      name: updatedProduct.name,
      price: updatedProduct.price
    });

    return updatedProduct;
  }
}