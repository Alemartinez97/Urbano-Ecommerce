import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InventoryService } from '../../application/services/inventory.service';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @EventPattern('product_created') // El nombre del evento que emite el Catalog
  async handleProductCreated(@Payload() data: any) {
    console.log('Evento recibido en Inventory:', data);
    return await this.inventoryService.handleProductCreated(data);
  }
}