import { Injectable, ConflictException, InternalServerErrorException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { IEncryptionService } from '../../domain/services/encryption.service.interface';
import { UserEntity } from '../../infrastructure/persistence/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Repository } from 'typeorm';
import { logger } from '../../common/logger';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject('IEncryptionService')
    private readonly encryptionService: IEncryptionService,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async validateCredentials(email: string, password: string): Promise<Omit<UserEntity, 'password'> | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
    if (!user || !(await this.encryptionService.compare(password, user.password))) return null;
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
}