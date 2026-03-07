import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsNumber()
  @Min(0)
  price: number;
  @IsString()
  sku: string;
  @IsString()
  categoryId: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
  
  export interface UpdateProductDto extends Partial<CreateProductDto> {
    id: string;
  }