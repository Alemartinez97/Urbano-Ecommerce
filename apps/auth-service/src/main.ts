import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AppModule);

  // Obtenemos el ConfigService para manejar puertos dinámicos
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;

  // 1. Validaciones Globales: Activa los decoradores @IsEmail, @MinLength, etc.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían datos extra
      transform: true, // Convierte tipos automáticamente (ej. string a number)
    }),
  );

  // 2. Prefijo Global: Todas las rutas empezarán con /api (ej: /api/auth/login)
  app.setGlobalPrefix('api');

  // 3. CORS: Importante para que tu frontend o Postman no tengan bloqueos
  app.enableCors();

  const config = new DocumentBuilder().setTitle("Urbano - auth-service").setVersion("1.0").build(); 
  const document = SwaggerModule.createDocument(app, config); 
  SwaggerModule.setup("api/docs", app, document);  await app.listen(port);
  
  logger.log(`🔐 Auth Microservice is running on: http://localhost:${port}/api`);
}
bootstrap();