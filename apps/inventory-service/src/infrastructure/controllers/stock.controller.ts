import { Controller, Get, Param, Query } from '@nestjs/common';
import { InventoryService } from '../../application/services/inventory.service';

@Controller('stock')
export class StockController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  async getByProductId(@Param('productId') productId: string) {
    const item = await this.inventoryService.getStock(productId);
    return { productId, quantity: item?.quantity ?? 0 };
  }

  @Get()
  async getBatch(@Query('productIds') productIdsStr?: string) {
    const productIds = productIdsStr ? productIdsStr.split(',').map((id) => id.trim()).filter(Boolean) : [];
    return await this.inventoryService.getStockBatch(productIds);
  }
}
