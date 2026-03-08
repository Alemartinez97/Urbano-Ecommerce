import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { logger } from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían datos extra
      transform: true, // Convierte tipos automáticamente (ej. string a number)
    }),
  );

  app.setGlobalPrefix('api');
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors(corsOrigin ? { origin: corsOrigin.split(',').map((o) => o.trim()) } : undefined);

  const config = new DocumentBuilder().setTitle("Urbano - auth-service").setVersion("1.0").build(); 
  const document = SwaggerModule.createDocument(app, config); 
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(port);

  logger.log(`Application listening on http://localhost:${port}/api`, 'Bootstrap', { port });
}
bootstrap();