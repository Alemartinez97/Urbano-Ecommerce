import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from '../../infrastructure/persistence/user.entity';
import { ProviderProfileEntity } from '../../infrastructure/persistence/provider-profile.entity';
import type { IEncryptionService } from '../../domain/services/encryption.service.interface';

describe('UsersService (TDD - Realtime Connectivity & Geofencing)', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let providerProfileRepository: jest.Mocked<Repository<ProviderProfileEntity>>;

  const mockUserRepository = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
  });

  const mockProviderProfileRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  });

  const mockEncryptionService = () => ({
    hash: jest.fn(),
    compare: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useFactory: mockUserRepository,
        },
        {
          provide: getRepositoryToken(ProviderProfileEntity),
          useFactory: mockProviderProfileRepository,
        },
        {
          provide: 'IEncryptionService',
          useFactory: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    providerProfileRepository = module.get(getRepositoryToken(ProviderProfileEntity));
  });

  describe('toggleOnline (Caso de Uso: Conectar/Desconectar Proveedor)', () => {
    const userId = 'user-123';
    const lat = -34.6037;
    const lon = -58.3816;

    it('debe conectar al proveedor (isOnline = true) y guardar sus coordenadas en tiempo real', async () => {
      const mockProfile = {
        id: 'profile-456',
        category: 'STAFF',
        isOnline: false,
        latitude: null,
        longitude: null,
      } as any;

      const mockUser = {
        id: userId,
        role: 'PROVIDER',
        providerProfile: mockProfile,
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);
      providerProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        isOnline: true,
        latitude: lat,
        longitude: lon,
      });

      const result = await service.toggleOnline(userId, true, lat, lon);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId }, relations: ['providerProfile'] });
      expect(providerProfileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        isOnline: true,
        latitude: lat,
        longitude: lon,
      }));
      expect(result.providerProfile.isOnline).toBe(true);
      expect(result.providerProfile.latitude).toBe(lat);
    });

    it('debe desconectar al proveedor (isOnline = false) y limpiar las coordenadas', async () => {
      const mockProfile = {
        id: 'profile-456',
        category: 'STAFF',
        isOnline: true,
        latitude: lat,
        longitude: lon,
      } as any;

      const mockUser = {
        id: userId,
        role: 'PROVIDER',
        providerProfile: mockProfile,
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);
      providerProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        isOnline: false,
        latitude: null,
        longitude: null,
      });

      const result = await service.toggleOnline(userId, false);

      expect(providerProfileRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        isOnline: false,
        latitude: null,
        longitude: null,
      }));
      expect(result.providerProfile.isOnline).toBe(false);
      expect(result.providerProfile.latitude).toBeNull();
    });

    it('debe lanzar ConflictException si el usuario no es un proveedor', async () => {
      const mockUser = {
        id: userId,
        role: 'CUSTOMER',
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.toggleOnline(userId, true, lat, lon)).rejects.toThrow(ConflictException);
    });
  });

  describe('getActiveProvidersCount (Caso de Uso: Contar oferta geocercana)', () => {
    it('debe retornar la cantidad de proveedores de la categoria correspondiente dentro de la geocerca', async () => {
      // Coordenadas Obelisco: -34.6037, -58.3816
      const centerLat = -34.6037;
      const centerLon = -58.3816;
      const radiusKm = 5.0; // 5 km
      const category = 'STAFF';

      const mockActiveProfiles = [
        { id: 'p1', category: 'STAFF', isOnline: true, latitude: -34.6042, longitude: -58.3850 }, // ~0.3 km (dentro)
        { id: 'p2', category: 'STAFF', isOnline: true, latitude: -34.5889, longitude: -58.4301 }, // ~4.75 km (dentro)
        { id: 'p3', category: 'STAFF', isOnline: true, latitude: -34.7242, longitude: -58.2612 }, // ~20.0 km (fuera)
        { id: 'p4', category: 'MUSIC', isOnline: true, latitude: -34.6037, longitude: -58.3816 }, // Categoria distinta (excluido)
      ] as any[];

      providerProfileRepository.find.mockImplementation((opts: any) => {
        const cat = opts?.where?.category;
        return Promise.resolve(mockActiveProfiles.filter(p => !cat || p.category === cat));
      });

      const count = await service.getActiveProvidersCount(category, centerLat, centerLon, radiusKm);

      expect(providerProfileRepository.find).toHaveBeenCalledWith({ where: { category, isOnline: true } });
      // p1 y p2 están dentro, p3 está fuera, p4 es de otra categoría (excluido en BD por find)
      expect(count).toBe(2);
    });
  });
});
