import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvConfig } from './config/env.validation';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const configService = app.get<ConfigService<EnvConfig>>(ConfigService);

  // Security headers
  app.use(helmet());
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');

  const corsOrigin = configService.get('CORS_ORIGIN')!;
  const corsCredentials = configService.get('CORS_CREDENTIALS')!;
  const corsMethods = configService.get('CORS_METHODS')!;
  const corsAllowedHeaders = configService.get('CORS_ALLOWED_HEADERS')!;

  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: corsCredentials,
    methods: corsMethods.split(',').map((method) => method.trim()),
    allowedHeaders: corsAllowedHeaders
      .split(',')
      .map((header) => header.trim()),
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Address Validation API')
    .setDescription(
      'A robust API for validating and standardizing US property addresses. ' +
      'The service integrates with Google Geocoding API to provide accurate address validation, ' +
      'correction, and standardization. Supports edge cases like partial addresses and typos.',
    )
    .setVersion('1.0.0')
    .addTag('address', 'Address validation operations')
    .addTag('health', 'Health check operations')
    .addServer(`http://localhost:${configService.get('PORT')}`, 'Local development')
    .addServer('https://api.example.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer token authentication (currently not required - API is open)',
        name: 'Authorization',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Address Validation API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = configService.get('PORT')!;
  const logger = app.get(Logger);

  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(`Swagger documentation available at: http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`CORS configured - Origins: ${corsOrigin}`, 'Bootstrap');
  logger.log(`Environment: ${configService.get('NODE_ENV')}`, 'Bootstrap');
  logger.log(`Log Level: ${configService.get('LOG_LEVEL')}`, 'Bootstrap');
  logger.log(`Log Format: ${configService.get('LOG_FORMAT')}`, 'Bootstrap');
}
bootstrap();

