import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';


async function bootstrap() {
  const logger = new Logger('OrdersService');
  const app = await NestFactory.create(AppModule);

  // 1. Configuración de Puerto Dinámica
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3005;

  // 2. Validaciones Globales: Crucial para los DTOs de compra
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Ignora datos que no estén en el DTO
      forbidNonWhitelisted: true, // Tira error si mandan basura
      transform: true, // Convierte tipos automáticamente (ej: string a number)
    }),
  );

  // 3. Prefijo Global para la API
  app.setGlobalPrefix('api');

  // 4. Habilitamos CORS para que tu App en React Native pueda pegarle sin dramas
  app.enableCors();

  await app.listen(port);
  
  logger.log(`🛒 Orders Microservice is running on: http://localhost:${port}/api`);
}
bootstrap();