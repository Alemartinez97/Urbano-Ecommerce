import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EventServiceEntity } from '../persistence/product.entity'; // La entidad ahora es EventServiceEntity
import { ProductController } from '../controllers/product.controller';
import { HealthController } from '../controllers/health.controller';
import { ProductService } from '../../application/services/product.service';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventServiceEntity]), // Registramos la nueva entidad del catálogo
    PassportModule,
    // Configuración del JWT para proteger los endpoints de proveedores
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [ProductController, HealthController],
  providers: [
    ProductService,
    JwtStrategy, // Estrategia para validar tokens JWT en los endpoints protegidos
  ],
  exports: [ProductService],
})
export class CatalogModule { }