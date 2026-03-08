import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../persistence/user.entity';
import { UsersService } from '../../application/services/users.service';
import { BcryptEncryptionService } from '../../domain/services/bcrypt-encryption.service';
import { UsersController } from '../controllers/users.controller';
import { HealthController } from '../controllers/health.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [UsersController, HealthController],
  providers: [
    UsersService,
    JwtStrategy,
    {
      provide: 'IEncryptionService',
      useClass: BcryptEncryptionService,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}