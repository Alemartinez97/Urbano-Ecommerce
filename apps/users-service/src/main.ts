import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { UsersModule } from './infraestructure/modules/users.module';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(3000);
  console.log(`Users Service is running on: ${await app.getUrl()}`);
}
bootstrap();