import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../persistence/user.entity';
import { UsersService } from '../../application/services/users.service';
import { BcryptEncryptionService } from '../../domain/services/bcrypt-encryption.service';
import { UsersController } from '../controllers/users.controller';

@Module({
  imports: [
    // Registramos la entidad para que TypeORM cree la tabla en 'users-db'
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      // Vinculamos el Token que usamos en el @Inject con la implementación real
      provide: 'IEncryptionService',
      useClass: BcryptEncryptionService,
    },
  ],
  exports: [UsersService], // Lo exportamos por si otro módulo lo necesita
})
export class UsersModule {}