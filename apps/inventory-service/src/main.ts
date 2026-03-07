import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3004;
  const eventBusUrl = configService.get<string>('EVENT_BUS_URL') ?? 'amqp://event-bus:5672';

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
  const config = new DocumentBuilder()
    .setTitle('Urbano - inventory-service')
    .setDescription('API para la gestión de inventario y stock')
    .setVersion('1.0')
    .addTag('inventory')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  Logger.log(`Inventory Service running on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
