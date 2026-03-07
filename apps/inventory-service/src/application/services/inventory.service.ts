import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryEntity } from '../../domain/entities/inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepo: Repository<InventoryEntity>,
  ) {}

  // Este método se ejecutará cuando llegue un mensaje de RabbitMQ
  async handleProductCreated(data: { id: string }) {
    const newInventory = this.inventoryRepo.create({
      productId: data.id,
      quantity: 0, // Iniciamos en cero
    });
    return await this.inventoryRepo.save(newInventory);
  }

  async getStock(productId: string) {
    return await this.inventoryRepo.findOne({ where: { productId } });
  }

  async updateStock(productId: string, quantity: number) {
    const item = await this.inventoryRepo.findOne({ where: { productId } });
    if (item) {
      item.quantity = quantity;
      return await this.inventoryRepo.save(item);
    }
  }
}