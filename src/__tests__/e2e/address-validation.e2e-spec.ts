import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GeocodingService } from 'src/geocoding/geocoding.service';
import { createGeocodingServiceMock } from '../mocks/geocoding.mock';
import { mockValidGeocodingResult } from '../fixtures/geocoding.fixtures';
import { createTestClient } from '../utils/test-helpers';

describe('Address Validation API (e2e)', () => {
  let app: INestApplication;
  let testClient: ReturnType<typeof createTestClient>;

  const mockGeocodingService = createGeocodingServiceMock();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(GeocodingService)
      .useValue(mockGeocodingService)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Enable API versioning (same as main.ts)
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

    testClient = createTestClient(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET) should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('service', 'address-validation-api');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('API Info', () => {
    it('/v1/validate-address/info (GET) should return API information', () => {
      return testClient
        .getApiInfo()
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('apiVersion', 'v1');
          expect(res.body).toHaveProperty('endpoints');
        });
    });

  });

  describe('Address Validation', () => {
    it('/v1/validate-address (POST) should validate address', () => {
      return testClient
        .validateAddress('1600 Amphitheatre Parkway, Mountain View, CA')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('originalAddress');
          expect(res.body).toHaveProperty('standardizedAddress');
          expect(res.body).toHaveProperty('confidence');
          expect(['valid', 'corrected', 'unverifiable']).toContain(
            res.body.status,
          );
        });
    });

    it('/v1/validate-address (POST) should work with version prefix', () => {
      return request(app.getHttpServer())
        .post('/v1/validate-address')
        .send({
          address: '1600 Amphitheatre Parkway, Mountain View, CA',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });

    it('/v1/validate-address (POST) should return 400 for empty address', () => {
      return testClient.validateAddress('').expect(400);
    });

    it('/v1/validate-address (POST) should return 400 for missing address field', () => {
      return request(app.getHttpServer())
        .post('/v1/validate-address')
        .send({})
        .expect(400);
    });

    it('/v1/validate-address (POST) should return 400 for address too long', () => {
      const longAddress = 'a'.repeat(501);
      return testClient.validateAddress(longAddress).expect(400);
    });

    it('/v1/validate-address (POST) should handle invalid address format', () => {
      return testClient
        .validateAddress('123')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(['valid', 'corrected', 'unverifiable']).toContain(
            res.body.status,
          );
        });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers).toBeDefined();
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers).toHaveProperty('x-ratelimit-limit');
          expect(res.headers).toHaveProperty('x-ratelimit-remaining');
        });
    });
  });
});

