import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './infrastructure/modules/users.module';
import { UserEntity } from './infrastructure/persistence/user.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoLoadEntities: true,
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [UserEntity],
        synchronize: true,
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    UsersModule,
  ],
})
export class AppModule {}
