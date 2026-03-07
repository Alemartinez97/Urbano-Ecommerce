import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.EVENT_BUS_URL || 'amqp://event-bus:5672'],
      queue: 'inventory_queue',
      queueOptions: { durable: false },
    },
  });
  await app.startAllMicroservices();
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 3004);
}
bootstrap();
