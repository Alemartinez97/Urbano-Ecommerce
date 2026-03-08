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

  async handleProductCreated(data: { id: string; initialStock?: number }) {
    const newInventory = this.inventoryRepo.create({
      productId: data.id,
      quantity: data.initialStock ?? 0,
    });
    return await this.inventoryRepo.save(newInventory);
  }

  async getStock(productId: string) {
    return await this.inventoryRepo.findOne({ where: { productId } });
  }

  async getStockBatch(productIds: string[]): Promise<{ productId: string; quantity: number }[]> {
    if (productIds.length === 0) return [];
    const results: { productId: string; quantity: number }[] = [];
    for (const productId of productIds) {
      const item = await this.inventoryRepo.findOne({ where: { productId } });
      results.push({ productId, quantity: item?.quantity ?? 0 });
    }
    return results;
  }

  async updateStock(productId: string, quantity: number) {
    const item = await this.inventoryRepo.findOne({ where: { productId } });
    if (item) {
      item.quantity = quantity;
      return await this.inventoryRepo.save(item);
    }
  }

  async handleOrderCreated(data: { orderId: string; items: { productId: string; quantity: number; price?: number }[] }) {
    for (const item of data.items) {
      const inventory = await this.inventoryRepo.findOne({ where: { productId: item.productId } });
      if (inventory) {
        const newQuantity = Math.max(0, inventory.quantity - item.quantity);
        inventory.quantity = newQuantity;
        await this.inventoryRepo.save(inventory);
      }
    }
  }
}