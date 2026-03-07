import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './infraestructure/modules/users.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // Usamos la URL que definimos en el docker-compose.yml
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true, 
        synchronize: true, 
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    UsersModule,
  ],
})
export class AppModule {}