import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InventoryService } from '../../application/services/inventory.service';
import { logger } from '../../common/logger';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @EventPattern('product_created')
  async handleProductCreated(@Payload() data: { id: string; name?: string; initialStock?: number }) {
    logger.log('Event product_created received', 'InventoryController', { productId: data.id });
    return await this.inventoryService.handleProductCreated(data);
  }

  @EventPattern('order_created')
  async handleOrderCreated(@Payload() data: { orderId: string; items: { productId: string; quantity: number; price?: number }[] }) {
    logger.log('Event order_created received', 'InventoryController', { orderId: data.orderId, itemCount: data.items?.length });
    return await this.inventoryService.handleOrderCreated(data);
  }
}