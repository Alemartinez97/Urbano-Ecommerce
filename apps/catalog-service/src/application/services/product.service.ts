import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { EventServiceEntity, ServiceCategory, PricingType } from '../../infrastructure/persistence/product.entity';
import { CreateEventServiceDto, UpdateEventServiceDto, SearchEventServicesDto } from '../dtos/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(EventServiceEntity)
    private readonly serviceRepository: Repository<EventServiceEntity>,
  ) {}

  // Devuelve todos los servicios activos del marketplace (listado principal del E-commerce)
  async findAll(): Promise<EventServiceEntity[]> {
    return this.serviceRepository.find({
      where: { active: true },
      order: { rating: 'DESC', createdAt: 'DESC' },
    });
  }

  // Devuelve un servicio específico por su ID
  async findOne(id: string): Promise<EventServiceEntity> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return service;
  }

  // Buscador estilo E-commerce: filtra por categoría, precio máximo y ordena según lo requerido
  // Es la base sobre la que se construirá el algoritmo de matching e IA
  async search(params: SearchEventServicesDto): Promise<EventServiceEntity[]> {
    const query = this.serviceRepository.createQueryBuilder('service');
    query.where('service.active = true');

    // Filtro por categoría (Comida, Música, Personal, etc.)
    if (params.category) {
      query.andWhere('service.category = :category', { category: params.category });
    }

    // Filtro por precio máximo (para el comparador de precios)
    if (params.maxPrice) {
      query.andWhere('service.basePrice <= :maxPrice', { maxPrice: params.maxPrice });
    }

    // Búsqueda por tags (base para el buscador IA: "asado", "dj", "mozo")
    if (params.tags) {
      query.andWhere('service.tags LIKE :tag', { tag: `%${params.tags}%` });
    }

    // Ordenar por precio (de menor a mayor) para mostrar las mejores ofertas primero
    if (params.sortByPrice === 'asc') {
      query.orderBy('service.basePrice', 'ASC');
    } else if (params.sortByPrice === 'desc') {
      query.orderBy('service.basePrice', 'DESC');
    } else {
      // Por defecto, ordenar por rating (los mejores proveedores primero)
      query.orderBy('service.rating', 'DESC');
    }

    return query.getMany();
  }

  // Crea un nuevo servicio (lo llama el proveedor desde su panel de gestión)
  async create(providerId: string, data: CreateEventServiceDto): Promise<EventServiceEntity> {
    const service = this.serviceRepository.create({
      ...data,
      providerId,
    });
    const saved = await this.serviceRepository.save(service);
    this.logger.log(`Nuevo servicio creado: ${saved.name} (Proveedor: ${providerId})`);
    return saved;
  }

  // Actualiza un servicio existente (solo el proveedor dueño puede hacerlo)
  async update(id: string, providerId: string, data: UpdateEventServiceDto): Promise<EventServiceEntity> {
    const service = await this.serviceRepository.findOne({ where: { id, providerId } });
    if (!service) {
      throw new NotFoundException(`Servicio ${id} no encontrado o no tienes permisos para modificarlo`);
    }
    Object.assign(service, data);
    return this.serviceRepository.save(service);
  }

  // Devuelve todos los servicios de un proveedor específico (para su panel de gestión)
  async findByProvider(providerId: string): Promise<EventServiceEntity[]> {
    return this.serviceRepository.find({ where: { providerId } });
  }
}