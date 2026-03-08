import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from '../../application/services/product.service';
import { ProductEntity } from '../persistence/product.entity';
import { CreateProductDto, ProductWithQuantityDto } from '../../application/dtos/product.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async findAll(): Promise<ProductWithQuantityDto[]> {
    return await this.productService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async findOne(@Param('id') id: string): Promise<ProductWithQuantityDto> {
    return await this.productService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductEntity> {
    return await this.productService.create(createProductDto);
  }
}