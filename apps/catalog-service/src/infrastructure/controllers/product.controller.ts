import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductService } from '../../application/services/product.service';
import { EventServiceEntity, ServiceCategory } from '../persistence/product.entity';
import { CreateEventServiceDto, UpdateEventServiceDto, SearchEventServicesDto } from '../../application/dtos/product.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Servicios EventGo')
@Controller('services')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Listado principal del marketplace (no requiere login para que los clientes puedan ver precios)
  @Get()
  @ApiOperation({ summary: 'Listar todos los servicios del marketplace' })
  async findAll(): Promise<EventServiceEntity[]> {
    return await this.productService.findAll();
  }

  // Buscador estilo E-commerce: filtra por categoría, precio máximo, y tags IA
  // Ejemplo: GET /api/services/search?category=STAFF&maxPrice=5000&sortByPrice=asc
  @Get('search')
  @ApiOperation({ summary: 'Buscar servicios con filtros (E-commerce)' })
  @ApiQuery({ name: 'category', enum: ServiceCategory, required: false })
  @ApiQuery({ name: 'maxPrice', type: Number, required: false })
  @ApiQuery({ name: 'sortByPrice', enum: ['asc', 'desc'], required: false })
  @ApiQuery({ name: 'tags', type: String, required: false, description: 'Palabras clave para la búsqueda IA (ej: asado, dj, mozo)' })
  async search(@Query() params: SearchEventServicesDto): Promise<any[]> {
    return await this.productService.search(params);
  }

  // Detalle de un servicio específico
  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un servicio' })
  async findOne(@Param('id') id: string): Promise<EventServiceEntity> {
    return await this.productService.findOne(id);
  }

  // El proveedor publica un nuevo servicio en el marketplace (requiere ser PROVIDER)
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Publicar un nuevo servicio (solo proveedores)' })
  async create(@Body() dto: CreateEventServiceDto, @Req() req: any): Promise<EventServiceEntity> {
    // El providerId lo extraemos del JWT para garantizar que el proveedor solo publica en su nombre
    return await this.productService.create(req.user.userId, dto);
  }

  // El proveedor actualiza uno de sus servicios existentes
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar un servicio propio' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventServiceDto,
    @Req() req: any,
  ): Promise<EventServiceEntity> {
    return await this.productService.update(id, req.user.userId, dto);
  }

  // El proveedor ve todos sus servicios publicados (panel de gestión del proveedor)
  @Get('me/my-services')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Ver todos mis servicios publicados (solo el proveedor)' })
  async myServices(@Req() req: any): Promise<EventServiceEntity[]> {
    return await this.productService.findByProvider(req.user.userId);
  }
}