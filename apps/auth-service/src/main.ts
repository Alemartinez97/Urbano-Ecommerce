import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
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
      whitelist: true,           // Elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían datos extra
      transform: true,           // Convierte tipos automáticamente (ej. string a number)
    }),
  );

  // Prefijo global y versionado URI: todas las rutas serán /api/v{n}/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors(corsOrigin ? { origin: corsOrigin.split(',').map((o) => o.trim()) } : undefined);

  // Documentación Swagger disponible en /api/v1/docs
  const config = new DocumentBuilder()
    .setTitle('EventGo - auth-service')
    .setDescription('Autenticación con Google OAuth y emisión de tokens JWT')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(port);
  logger.log(`Application listening on http://localhost:${port}/api/v1`, 'Bootstrap', { port });
}
bootstrap();