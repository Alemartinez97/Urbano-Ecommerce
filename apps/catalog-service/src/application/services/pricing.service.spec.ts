import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';

describe('PricingService (TDD Dynamic Pricing)', () => {
  let service: PricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePrice', () => {
    it('debe mantener la tarifa base (multiplicador 1.0) si hay más oferta que demanda (mercado equilibrado)', () => {
      const basePrice = 1000;
      const demandCount = 2; // 2 eventos
      const activeProviders = 5; // 5 proveedores online

      const result = service.calculatePrice(basePrice, demandCount, activeProviders);
      expect(result.finalPrice).toBe(1000);
      expect(result.multiplier).toBe(1.0);
    });

    it('debe aumentar la tarifa (recargo del 30%) si la demanda supera la oferta (ej. 8 demandas y 2 proveedores)', () => {
      const basePrice = 1000;
      const demandCount = 8;
      const activeProviders = 2;

      // Multiplicador esperado: 1.0 + ((8 - 2) / (2 + 1)) * 0.15 = 1.0 + (6 / 3) * 0.15 = 1.30
      const result = service.calculatePrice(basePrice, demandCount, activeProviders);
      expect(result.multiplier).toBeCloseTo(1.30);
      expect(result.finalPrice).toBeCloseTo(1300);
    });

    it('debe calcular el multiplicador de forma segura cuando la oferta de proveedores online es cero', () => {
      const basePrice = 1000;
      const demandCount = 10;
      const activeProviders = 0;

      // Multiplicador esperado: 1.0 + ((10 - 0) / (0 + 1)) * 0.15 = 1.0 + (10 / 1) * 0.15 = 2.50
      const result = service.calculatePrice(basePrice, demandCount, activeProviders);
      expect(result.multiplier).toBeCloseTo(2.50);
      expect(result.finalPrice).toBeCloseTo(2500);
    });

    it('debe retornar la tarifa base si el cálculo de multiplicador da menor a 1.0 (ej. demanda menor que la oferta)', () => {
      const basePrice = 1000;
      const demandCount = 1;
      const activeProviders = 10;

      const result = service.calculatePrice(basePrice, demandCount, activeProviders);
      expect(result.multiplier).toBe(1.0);
      expect(result.finalPrice).toBe(1000);
    });
  });
});
