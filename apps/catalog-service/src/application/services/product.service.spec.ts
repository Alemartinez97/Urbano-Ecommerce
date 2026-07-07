import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ProductService } from './product.service';
import { PricingService } from './pricing.service';
import { LocationService } from './location.service';
import { EventServiceEntity, ServiceCategory, PricingType } from '../../infrastructure/persistence/product.entity';
import { SearchEventServicesDto } from '../dtos/product.dto';

describe('ProductService (Integration with Pricing & Location)', () => {
  let service: ProductService;
  let repository: jest.Mocked<Repository<EventServiceEntity>>;
  let pricingService: PricingService;
  let httpService: jest.Mocked<HttpService>;

  const mockProductRepository = () => ({
    createQueryBuilder: jest.fn().mockImplementation(() => {
      const builder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'srv-1',
            name: 'DJ Test',
            basePrice: 10000,
            category: ServiceCategory.MUSIC,
            pricingType: PricingType.FIXED,
            providerId: 'prov-456',
          },
        ]),
      };
      return builder;
    }),
  });

  const mockHttpService = () => ({
    get: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        PricingService,
        LocationService,
        {
          provide: getRepositoryToken(EventServiceEntity),
          useFactory: mockProductRepository,
        },
        {
          provide: HttpService,
          useFactory: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(getRepositoryToken(EventServiceEntity));
    pricingService = module.get<PricingService>(PricingService);
    httpService = module.get(HttpService);
  });

  describe('search con Tarifas Dinámicas', () => {
    it('debe devolver los servicios con precio original (multiplicador 1.0) si no se provee lat/lon', async () => {
      const searchDto: SearchEventServicesDto = {
        category: ServiceCategory.MUSIC,
      };

      const result = await service.search(searchDto);

      expect(result[0]).toHaveProperty('dynamicPrice');
      expect(result[0]).toHaveProperty('priceMultiplier');
      expect(result[0].dynamicPrice).toBe(10000);
      expect(result[0].priceMultiplier).toBe(1.0);
    });

    it('debe calcular e integrar la tarifa dinámica cuando se proveen coordenadas y se consulta la oferta/demanda por API', async () => {
      const searchDto: SearchEventServicesDto & { latitude?: number; longitude?: number } = {
        category: ServiceCategory.MUSIC,
        latitude: -34.6037,
        longitude: -58.3816,
      };

      // Mock de la API de usuarios: devuelve cantidad de proveedores activos (Oferta = 2)
      httpService.get.mockImplementation((url: string) => {
        if (url.includes('/api/v1/providers/active-count')) {
          return of({ data: { count: 2 } } as any);
        }
        if (url.includes('/api/v1/orders/active-count')) {
          return of({ data: { count: 8 } } as any);
        }
        return of({ data: {} } as any);
      });

      const result = await service.search(searchDto);

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(result[0]).toHaveProperty('dynamicPrice');
      expect(result[0]).toHaveProperty('priceMultiplier');
      
      // Multiplicador esperado para 8 demandas y 2 proveedores: 1.0 + (6/3)*0.15 = 1.30
      expect(result[0].priceMultiplier).toBeCloseTo(1.30);
      expect(result[0].dynamicPrice).toBeCloseTo(13000);
    });
  });
});
