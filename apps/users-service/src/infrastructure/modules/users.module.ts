import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../persistence/user.entity';
import { UsersService } from '../../application/services/users.service';
import { BcryptEncryptionService } from '../../domain/services/bcrypt-encryption.service';
import { UsersController } from '../controllers/users.controller';
import { HealthController } from '../controllers/health.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [UsersController, HealthController],
  providers: [
    UsersService,
    {
      provide: 'IEncryptionService',
      useClass: BcryptEncryptionService,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}