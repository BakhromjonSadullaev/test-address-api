import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AddressController } from './address/address.controller';
import { AddressService } from './address/address.service';
import { GeocodingService } from './geocoding/geocoding.service';
import { HealthController } from './health/health.controller';
import { HttpModule } from '@nestjs/axios';
import { envValidationSchema, EnvConfig } from './config/env.validation';
import { loggerConfig } from './config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config) => {
        const result = envValidationSchema.safeParse(config);
        if (!result.success) {
          console.error('❌ Invalid environment variables:');
          result.error.errors.forEach((error) => {
            console.error(`  - ${error.path.join('.')}: ${error.message}`);
          });
          throw new Error('Invalid environment variables');
        }
        return result.data;
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: loggerConfig,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig>) => [
        {
          ttl: configService.get('RATE_LIMIT_TTL')! * 1000, // Convert to milliseconds
          limit: configService.get('RATE_LIMIT_MAX')!,
        },
      ],
    }),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<EnvConfig>) => {
        const redisHost = configService.get('REDIS_HOST')!;
        const redisPort = configService.get('REDIS_PORT')!;
        const redisPassword = configService.get('REDIS_PASSWORD');
        const redisTls = configService.get('REDIS_TLS')!;
        const ttl = configService.get('REDIS_TTL')! * 1000; // Convert to milliseconds

        if (redisHost) {
          try {
            const store = await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
                ...(redisTls && { tls: true }),
              },
              ...(redisPassword && { password: redisPassword }),
            });

            console.log(`✅ Redis cache connected at ${redisHost}:${redisPort}`);
            return {
              store: () => store,
              ttl,
              max: undefined,
              isGlobal: true,
            } as any;
          } catch (error) {
            console.error('❌ Failed to connect to Redis, falling back to in-memory cache:', error);
            return {
              ttl,
              max: 100,
              isGlobal: true,
            };
          }
        }

        console.log('📦 Using in-memory cache (Redis not configured)');
        return {
          ttl,
          max: 100,
          isGlobal: true,
        };
      },
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AppController, AddressController, HealthController],
  providers: [
    AddressService,
    GeocodingService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

