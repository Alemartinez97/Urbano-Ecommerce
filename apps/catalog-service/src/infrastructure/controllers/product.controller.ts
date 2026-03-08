import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ProductService } from '../../application/services/product.service';
import { ProductEntity } from '../persistence/product.entity';
import { CreateProductDto } from '../../application/dtos/product.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(): Promise<ProductEntity[]> {
    return await this.productService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductEntity> {
    return await this.productService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductEntity> {
    return await this.productService.create(createProductDto);
  }
}