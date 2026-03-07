import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CatalogModule } from './infrastructure/modules/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('CATALOG_DB_HOST'),
        port: config.get<number>('CATALOG_DB_PORT'),
        username: config.get<string>('CATALOG_DB_USER'),
        password: config.get<string>('CATALOG_DB_PASSWORD'),
        database: config.get<string>('CATALOG_DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    
    CatalogModule,
  ],
})
export class AppModule {}