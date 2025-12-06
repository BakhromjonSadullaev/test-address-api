import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthController } from 'src/health/health.controller';
import { GeocodingService } from 'src/geocoding/geocoding.service';

describe('HealthController', () => {
  let controller: HealthController;
  let geocodingService: jest.Mocked<GeocodingService>;
  let cacheManager: jest.Mocked<any>;

  beforeEach(async () => {
    const mockGeocodingService = {
      geocodeAddress: jest.fn(),
    };

    const mockCacheManager = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('test'),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    geocodingService = module.get(GeocodingService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    const mockGeocodingResult = {
      formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      addressComponents: {
        streetNumber: '1600',
        street: 'Amphitheatre Parkway',
        city: 'Mountain View',
        state: 'CA',
        zipCode: '94043',
      },
      location: { lat: 37.4224764, lng: -122.0842499 },
      placeId: 'ChIJ2eUgeAK6j4ARb5iSF_5qkA',
      types: ['street_address'],
    };

    geocodingService.geocodeAddress.mockResolvedValue(mockGeocodingResult);

    const result = await controller.healthCheck();

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('service');
    expect(result).toHaveProperty('checks');
    expect(result.status).toBe('ok');
    expect(result.service).toBe('address-validation-api');
    expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    expect(result.checks.service.status).toBe('ok');
    expect(result.checks.googleApi.status).toBe('ok');
    expect(result.checks.cache.status).toBe('ok');
  });
});

