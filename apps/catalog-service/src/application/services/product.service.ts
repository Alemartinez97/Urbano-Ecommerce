import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { firstValueFrom } from 'rxjs';
import { ProductEntity } from '../../infrastructure/persistence/product.entity';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { CreateProductDto, UpdateProductDto, ProductWithQuantityDto } from '../dtos/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @Inject('CATALOG_EVENT_BUS')
    private readonly client: ClientProxy,
    private readonly httpService: HttpService,
  ) {}

  async findAll(): Promise<ProductWithQuantityDto[]> {
    const products = await this.productRepository.find({ where: { active: true } });
    const productIds = products.map((p) => p.id);
    let quantityMap = new Map<string, number>();
    if (productIds.length > 0) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.get<{ productId: string; quantity: number }[]>('/api/stock', {
            params: { productIds: productIds.join(',') },
          }),
        );
        const list = Array.isArray(data) ? data : [];
        list.forEach((item) => quantityMap.set(item.productId, item.quantity));
      } catch (err) {
        this.logger.warn('Inventory service unavailable, returning quantity 0 for all products', err?.message ?? err);
      }
    }
    return products.map((p) => ({
      ...p,
      quantity: quantityMap.get(p.id) ?? 0,
    })) as ProductWithQuantityDto[];
  }

  async findOne(id: string): Promise<ProductWithQuantityDto> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    let quantity = 0;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{ productId: string; quantity: number }>(`/api/stock/${id}`),
      );
      quantity = data?.quantity ?? 0;
    } catch (err) {
      this.logger.warn(`Inventory service unavailable for product ${id}, returning quantity 0`, err?.message ?? err);
    }
    return { ...product, quantity } as ProductWithQuantityDto;
  }

  private generateSku(): string {
    return `SKU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  async create(data: CreateProductDto): Promise<ProductEntity> {
    if (!data.sku) {
      data.sku = this.generateSku();
    }
    const maxAttempts = 10;
    let attempts = 0;
    while (attempts < maxAttempts) {
      const existing = await this.productRepository.findOne({ where: { sku: data.sku } });
      if (!existing) break;
      data.sku = this.generateSku();
      attempts++;
    }
    if (attempts >= maxAttempts) {
      throw new InternalServerErrorException('No se pudo generar un SKU único');
    }
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
    const product = await this.productRepository.preload({ ...data });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);

    if (data.sku) {
      const existing = await this.productRepository.findOne({
        where: { sku: data.sku },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe un producto con este SKU: ${existing.sku}`);
      }
    }

    const updatedProduct = await this.productRepository.save(product);
    this.client.emit('product_updated', {
      id: updatedProduct.id,
      name: updatedProduct.name,
      price: updatedProduct.price
    });

    return updatedProduct;
  }
}