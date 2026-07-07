import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from '../../application/services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { HealthController } from '../controllers/health.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { GoogleStrategy } from '../strategies/google.strategy';

@Module({
  imports: [
    HttpModule, // Para hacer peticiones al users-service
    PassportModule,
    // Protección contra ataques de fuerza bruta
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },   // 3 peticiones por segundo
      { name: 'medium', ttl: 10000, limit: 20 }, // 20 peticiones por 10s
    ]),
    // Configuración del token JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController, HealthController],
  providers: [
    AuthService, 
    JwtStrategy, // Estrategia para proteger endpoints con JWT
    GoogleStrategy // Estrategia para el login con Google OAuth
  ],
  exports: [AuthService],
})
export class AuthModule {}