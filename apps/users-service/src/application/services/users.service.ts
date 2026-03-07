import { Injectable, ConflictException, InternalServerErrorException, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { IEncryptionService } from '../../domain/services/encryption.service.interface';
import { UserEntity } from '../../infrastructure/persistence/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import {  Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject('IEncryptionService')
    private readonly encryptionService: IEncryptionService,
  ) {}

  /**
   * Busca un usuario por email (usado por auth-service para login)
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Valida email + contraseña y devuelve el usuario sin password (para auth-service).
   */
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

  /**
   * Busca un usuario por su ID único (UUID)
   * Aplicamos validación de existencia para devolver el error HTTP correcto
   */
  async findOne(id: string): Promise<UserEntity> {
    // 1. Buscamos en la base de datos de 'users-db'
    const user = await this.userRepository.findOne({ 
      where: { id } 
    });

    // 2. Si no existe, lanzamos una excepción semántica de NestJS
    // Esto evita que el controlador devuelva un 200 con 'null'
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // 3. Retornamos la entidad (el ClassSerializerInterceptor del controller se encarga del resto)
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { email, password } = createUserDto;

    // 1. Verificación de existencia (Lógica de negocio intacta)
    const userExists = await this.userRepository.findOne({ where: { email } });
    if (userExists) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    try {
      // 2. Delegamos el cifrado a la capa de Infraestructura
      const hashedPassword = await this.encryptionService.hash(password);

      // 3. Persistencia de datos
      const newUser = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });

      const savedUser = await this.userRepository.save(newUser);
      return savedUser;
      
    } catch (error) {
      console.error(error); 
      throw new InternalServerErrorException('Error al procesar el registro');
    }
  }
}