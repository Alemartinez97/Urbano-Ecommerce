import { IsString, IsNumber, IsArray, ValidateNested, Min, IsUUID, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para los ítems individuales de la orden
 */
class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1, { message: 'La cantidad mínima es 1 unidad' })
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

/**
 * DTO principal para la creación de órdenes
 */
export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto) // Necesario para que class-transformer sepa qué clase usar
  items: OrderItemDto[];

  @IsNumber()
  @Min(0)
  totalAmount: number;
}