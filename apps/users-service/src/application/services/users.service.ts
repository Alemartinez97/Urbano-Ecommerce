import { Injectable, ConflictException, InternalServerErrorException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { IEncryptionService } from '../../domain/services/encryption.service.interface';
import { UserEntity } from '../../infrastructure/persistence/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Repository } from 'typeorm';
import { logger } from '../../common/logger';
import { ProviderProfileEntity } from '../../infrastructure/persistence/provider-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProviderProfileEntity)
    private readonly providerProfileRepository: Repository<ProviderProfileEntity>,
    @Inject('IEncryptionService')
    private readonly encryptionService: IEncryptionService,
  ) { }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async validateCredentials(email: string, password: string): Promise<Omit<UserEntity, 'password'> | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
    if (!user || !(await this.encryptionService.compare(password, user.password as any))) return null;
    const { password: _, ...result } = user;
    return result;
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { email, password } = createUserDto;
    const userExists = await this.userRepository.findOne({ where: { email } });
    if (userExists) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }
    try {
      const hashedPassword = await this.encryptionService.hash(password);
      const newUser = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });

      const savedUser = await this.userRepository.save(newUser);
      return savedUser;

    } catch (error) {
      logger.error('Error al procesar el registro', 'UsersService', { error: error instanceof Error ? error.message : String(error) });
      throw new InternalServerErrorException('Error al procesar el registro');
    }
  }

  // Busca un usuario por su email de Google. Si no existe, lo crea automáticamente sin contraseña
  // Esto permite que un proveedor o cliente comience a usar la app al instante
  async findOrCreateGoogleUser(profile: { googleId: string; email: string; firstName: string; lastName: string }): Promise<Omit<UserEntity, 'password'>> {
    let user = await this.userRepository.findOne({ where: { email: profile.email } });

    if (user) {
      // Si el usuario existe pero no tiene googleId, se lo asociamos
      if (!user.googleId) {
        user.googleId = profile.googleId;
        await this.userRepository.save(user);
      }
    } else {
      user = this.userRepository.create({
        email: profile.email,
        googleId: profile.googleId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: 'CUSTOMER',
      });
      user = await this.userRepository.save(user);
    }

    const { password: _, ...result } = user;
    return result;
  }

  // Convierte un usuario normal en proveedor, creando su perfil de trabajo
  async becomeProvider(userId: string, data: { category: string; bio?: string; latitude: number; longitude: number; radiusKm?: number }): Promise<UserEntity> {
    const user = await this.findOne(userId);

    if (user.role === 'PROVIDER') {
      throw new ConflictException('El usuario ya es un proveedor');
    }

    // Crear el perfil del proveedor
    const profile = this.providerProfileRepository.create({
      category: data.category,
      bio: data.bio,
      latitude: data.latitude,
      longitude: data.longitude,
      coverageRadiusKm: data.radiusKm || 10,
    });

    // Cambiamos el rol y vinculamos el perfil
    user.role = 'PROVIDER';
    user.providerProfile = profile;

    return await this.userRepository.save(user);
  }

  // Conecta o desconecta a un proveedor y registra su localización actual en tiempo real
  async toggleOnline(userId: string, isOnline: boolean, lat?: number, lon?: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['providerProfile'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    if (user.role !== 'PROVIDER' || !user.providerProfile) {
      throw new ConflictException('El usuario no tiene un perfil de proveedor activo');
    }

    user.providerProfile.isOnline = isOnline;
    if (isOnline) {
      if (lat === undefined || lon === undefined) {
        throw new ConflictException('Se requieren coordenadas de latitud y longitud para conectarse');
      }
      user.providerProfile.latitude = lat;
      user.providerProfile.longitude = lon;
    } else {
      user.providerProfile.latitude = null;
      user.providerProfile.longitude = null;
    }

    await this.providerProfileRepository.save(user.providerProfile);
    return user;
  }

  // Cuenta la cantidad de proveedores activos de una categoría que están dentro de una geocerca
  async getActiveProvidersCount(
    category: string,
    centerLat: number,
    centerLon: number,
    radiusKm: number,
  ): Promise<number> {
    const activeProviders = await this.providerProfileRepository.find({
      where: { category, isOnline: true },
    });

    let count = 0;
    for (const provider of activeProviders) {
      if (provider.latitude !== null && provider.longitude !== null) {
        const distance = this.calculateDistance(
          centerLat,
          centerLon,
          provider.latitude,
          provider.longitude,
        );
        if (distance <= radiusKm) {
          count++;
        }
      }
    }
    return count;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Retorna la lista ordenada de proveedores activos geocercanos
  async getActiveProvidersList(
    category: string,
    centerLat: number,
    centerLon: number,
    radiusKm: number,
  ): Promise<{ userId: string; distanceKm: number }[]> {
    const activeProviders = await this.providerProfileRepository.find({
      where: { category, isOnline: true },
      relations: ['user'], // Para obtener el userId
    });

    const list: { userId: string; distanceKm: number }[] = [];
    for (const provider of activeProviders) {
      if (provider.latitude !== null && provider.longitude !== null) {
        const distance = this.calculateDistance(
          centerLat,
          centerLon,
          provider.latitude,
          provider.longitude,
        );
        if (distance <= radiusKm) {
          list.push({
            userId: provider.user?.id || 'unknown',
            distanceKm: Math.round(distance * 100) / 100,
          });
        }
      }
    }

    // Ordenar de más cercano a más lejano (Algoritmo de Matching)
    return list.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}