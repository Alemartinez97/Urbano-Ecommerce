import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';

describe('LocationService (TDD Geolocation & Haversine)', () => {
  let service: LocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationService],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('calculateDistance (Fórmula de Haversine)', () => {
    it('debe dar 0 km de distancia para las mismas coordenadas', () => {
      const lat = -34.6037;
      const lon = -58.3816;
      const distance = service.calculateDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    it('debe calcular correctamente la distancia aproximada entre el Obelisco y Plaza Serrano (~4.75 km)', () => {
      const obeliscoLat = -34.6037;
      const obeliscoLon = -58.3816;
      const serranoLat = -34.5889;
      const serranoLon = -58.4301;

      const distance = service.calculateDistance(obeliscoLat, obeliscoLon, serranoLat, serranoLon);
      // Debe rondar los 4.75 km (permitimos un margen pequeño por aproximación esférica)
      expect(distance).toBeGreaterThanOrEqual(4.6);
      expect(distance).toBeLessThanOrEqual(4.9);
    });

    it('debe calcular correctamente distancias de larga escala (Buenos Aires a Madrid ~10000 km)', () => {
      const bsAsLat = -34.6037;
      const bsAsLon = -58.3816;
      const madridLat = 40.4168;
      const madridLon = -3.7038;

      const distance = service.calculateDistance(bsAsLat, bsAsLon, madridLat, madridLon);
      expect(distance).toBeGreaterThanOrEqual(9900);
      expect(distance).toBeLessThanOrEqual(10100);
    });
  });

  describe('isWithinRadius (Verificación de Geocerca)', () => {
    const centerLat = -34.6037; // Obelisco
    const centerLon = -58.3816;

    it('debe retornar true si el punto está dentro del radio (ej: Plaza Serrano a 5 km de radio)', () => {
      const targetLat = -34.5889;
      const targetLon = -58.4301;
      const isInside = service.isWithinRadius(centerLat, centerLon, targetLat, targetLon, 5);
      expect(isInside).toBe(true);
    });

    it('debe retornar false si el punto está fuera del radio (ej: Plaza Serrano a 3 km de radio)', () => {
      const targetLat = -34.5889;
      const targetLon = -58.4301;
      const isInside = service.isWithinRadius(centerLat, centerLon, targetLat, targetLon, 3);
      expect(isInside).toBe(false);
    });
  });

  describe('filterAndSortByDistance (Filtrado de proveedores geocercanos)', () => {
    const centerLat = -34.6037; // Obelisco
    const centerLon = -58.3816;
    const maxRadius = 5.0; // 5 km

    const mockProviders = [
      { id: 'prov-1', name: 'Mozo Palermo', latitude: -34.5889, longitude: -58.4301 }, // ~4.75 km (adentro)
      { id: 'prov-2', name: 'Mozo Microcentro', latitude: -34.6042, longitude: -58.3850 }, // ~0.3 km (adentro)
      { id: 'prov-3', name: 'Mozo Quilmes', latitude: -34.7242, longitude: -58.2612 }, // ~20.0 km (afuera)
    ];

    it('debe filtrar a los proveedores fuera del radio y ordenar los restantes de más cercano a más lejano', () => {
      const results = service.filterAndSortByDistance(centerLat, centerLon, maxRadius, mockProviders);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe('prov-2'); // Microcentro (~0.3 km) primero
      expect(results[1].id).toBe('prov-1'); // Palermo (~4.75 km) segundo
      expect(results.find(p => p.id === 'prov-3')).toBeUndefined(); // Quilmes descartado
    });

    it('debe incluir la distancia calculada en la respuesta', () => {
      const results = service.filterAndSortByDistance(centerLat, centerLon, maxRadius, mockProviders);
      expect(results[0]).toHaveProperty('distanceKm');
      expect(results[0].distanceKm).toBeLessThan(1.0);
    });
  });
});
