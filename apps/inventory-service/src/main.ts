import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { logger } from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3004;
  const eventBusUrl = configService.get<string>('EVENT_BUS_URL') ?? 'amqp://event-bus:5672';

  app.use(helmet());

  // Conexión al Event Bus RabbitMQ para recibir eventos de otras microservicios
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [eventBusUrl],
      queue: 'inventory_queue',
      queueOptions: { durable: false },
    },
  });
  await app.startAllMicroservices();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefijo global y versionado URI: todas las rutas serán /api/v{n}/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors(corsOrigin ? { origin: corsOrigin.split(',').map((o) => o.trim()) } : undefined);

  // Documentación Swagger disponible en /api/v1/docs
  const config = new DocumentBuilder()
    .setTitle('EventGo - availability-service')
    .setDescription('Gestión de disponibilidad horaria (Time Slots) de los proveedores. Pilar 2 de EventGo.')
    .setVersion('1.0')
    .addTag('availability')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(port);
  logger.log(`Application listening on http://localhost:${port}/api/v1`, 'Bootstrap', { port });
}
bootstrap();
