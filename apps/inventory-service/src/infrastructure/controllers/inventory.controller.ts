import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InventoryService } from '../../application/services/inventory.service';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @EventPattern('product_created')
  async handleProductCreated(@Payload() data: { id: string }) {
    return await this.inventoryService.handleProductCreated(data);
  }

  @EventPattern('order_created')
  async handleOrderCreated(@Payload() data: { orderId: string; items: { productId: string; quantity: number; price?: number }[] }) {
    return await this.inventoryService.handleOrderCreated(data);
  }
}