export class Product {
    constructor(
      public readonly id: string,
      public name: string,
      public description: string,
      public price: number,
      public sku: string,
      public categoryId: string,
    ) {}
  
    validatePrice() {
      if (this.price < 0) throw new Error('El precio debe ser positivo');
    }
  }