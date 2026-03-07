export class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    category?: string;
    active?: boolean;
  }
  
  export interface UpdateProductDto extends Partial<CreateProductDto> {
    id: string;
  }