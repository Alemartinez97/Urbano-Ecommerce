import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EventServiceEntity } from '../../infrastructure/persistence/product.entity';
import { CreateEventServiceDto, UpdateEventServiceDto, SearchEventServicesDto } from '../dtos/product.dto';
import { PricingService } from './pricing.service';
import { LocationService } from './location.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(EventServiceEntity)
    private readonly serviceRepository: Repository<EventServiceEntity>,
    private readonly pricingService: PricingService,
    private readonly locationService: LocationService,
    private readonly httpService: HttpService,
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
  async search(
    params: SearchEventServicesDto,
  ): Promise<(EventServiceEntity & { dynamicPrice: number; priceMultiplier: number })[]> {
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

    const services = await query.getMany();

    // Si no se especifican coordenadas de latitud/longitud, no hay cálculo dinámico (recargo 1.0)
    if (params.latitude === undefined || params.longitude === undefined) {
      return services.map((service) => ({
        ...service,
        dynamicPrice: Number(service.basePrice),
        priceMultiplier: 1.0,
      }));
    }

    // Valores para consultar la API de oferta/demanda
    const usersUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3002';
    const orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';
    const radius = params.radiusKm || 10;

    let activeProvidersCount = 0;
    let demandCount = 0;

    try {
      // 1. Consultar proveedores activos en la zona (Oferta)
      const providersRes = await firstValueFrom(
        this.httpService.get(`${usersUrl}/api/v1/providers/active-count`, {
          params: {
            category: params.category,
            latitude: params.latitude,
            longitude: params.longitude,
            radiusKm: radius,
          },
        }),
      );
      activeProvidersCount = providersRes.data.count ?? 0;

      // 2. Consultar pedidos activos en la zona (Demanda)
      const ordersRes = await firstValueFrom(
        this.httpService.get(`${orderUrl}/api/v1/orders/active-count`, {
          params: {
            category: params.category,
            latitude: params.latitude,
            longitude: params.longitude,
            radiusKm: radius,
          },
        }),
      );
      demandCount = ordersRes.data.count ?? 0;
    } catch (err) {
      this.logger.warn('Error al consultar oferta/demanda de tarifas dinámicas, usando base 1.0: ' + err.message);
    }

    // Calcular el precio dinámico de cada servicio
    return services.map((service) => {
      const { finalPrice, multiplier } = this.pricingService.calculatePrice(
        Number(service.basePrice),
        demandCount,
        activeProvidersCount,
      );
      return {
        ...service,
        dynamicPrice: finalPrice,
        priceMultiplier: multiplier,
      };
    });
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