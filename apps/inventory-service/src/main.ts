import { NestFactory } from '@nestjs/core';
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
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [eventBusUrl],
      queue: 'inventory_queue',
      queueOptions: { durable: false },
    },
  });
  await app.startAllMicroservices();

  app.setGlobalPrefix('api');
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors(corsOrigin ? { origin: corsOrigin.split(',').map((o) => o.trim()) } : undefined);
  const config = new DocumentBuilder()
    .setTitle('Urbano - inventory-service')
    .setDescription('API para la gestión de inventario y stock')
    .setVersion('1.0')
    .addTag('inventory')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Application listening on http://localhost:${port}/api`, 'Bootstrap', { port });
}
bootstrap();
