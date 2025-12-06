import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GeocodingService } from 'src/geocoding/geocoding.service';
import { EnvConfig } from 'src/config/env.validation';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let httpService: HttpService;
  let configService: ConfigService<EnvConfig>;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        GEOCODING_API_URL: 'https://geocoding.geo.census.gov/geocoder/locations/address',
        GEOCODING_API_KEY: undefined,
        CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE: 50,
        CIRCUIT_BREAKER_TIMEOUT: 10000,
        CIRCUIT_BREAKER_RESET_TIMEOUT: 30000,
        CIRCUIT_BREAKER_ROLLING_WINDOW: 10000,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeocodingService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService<EnvConfig>>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('geocodeAddress', () => {
    const mockSuccessResponse = {
      data: {
        status: 'OK',
        results: [
          {
            address_components: [
              {
                long_name: '1600',
                short_name: '1600',
                types: ['street_number'],
              },
              {
                long_name: 'Amphitheatre Parkway',
                short_name: 'Amphitheatre Pkwy',
                types: ['route'],
              },
              {
                long_name: 'Mountain View',
                short_name: 'Mountain View',
                types: ['locality'],
              },
              {
                long_name: 'California',
                short_name: 'CA',
                types: ['administrative_area_level_1'],
              },
              {
                long_name: '94043',
                short_name: '94043',
                types: ['postal_code'],
              },
            ],
            formatted_address:
              '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
            geometry: {
              location: {
                lat: 37.4224764,
                lng: -122.0842499,
              },
            },
            place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
            types: ['street_address'],
          },
        ],
      },
    };

    it('should successfully geocode a valid address', async () => {
      mockHttpService.get.mockReturnValue(of(mockSuccessResponse));

      const result = await service.geocodeAddress(
        '1600 Amphitheatre Parkway, Mountain View, CA',
      );

      expect(result.formattedAddress).toBe(
        '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      );
      expect(result.addressComponents.streetNumber).toBe('1600');
      expect(result.addressComponents.street).toBe('Amphitheatre Parkway');
      expect(result.addressComponents.city).toBe('Mountain View');
      expect(result.addressComponents.state).toBe('CA');
      expect(result.addressComponents.zipCode).toBe('94043');
      expect(result.location.lat).toBe(37.4224764);
      expect(result.location.lng).toBe(-122.0842499);
    });

    it('should handle ZERO_RESULTS status', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            status: 'ZERO_RESULTS',
            results: [],
          },
        }),
      );

      await expect(
        service.geocodeAddress('Invalid Address 99999'),
      ).rejects.toThrow(HttpException);

      await expect(
        service.geocodeAddress('Invalid Address 99999'),
      ).rejects.toThrow('Invalid address: address could not be found');
    });

    it('should handle REQUEST_DENIED status', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            status: 'REQUEST_DENIED',
            results: [],
          },
        }),
      );

      await expect(
        service.geocodeAddress('1600 Amphitheatre Parkway'),
      ).rejects.toThrow(HttpException);

      await expect(
        service.geocodeAddress('1600 Amphitheatre Parkway'),
      ).rejects.toThrow('Geocoding service unavailable');
    });

    it('should handle PARTIAL_MATCH status', async () => {
      mockHttpService.get.mockReturnValue(of(mockSuccessResponse));
      const partialMatchResponse = {
        ...mockSuccessResponse,
        data: {
          ...mockSuccessResponse.data,
          status: 'PARTIAL_MATCH',
        },
      };
      mockHttpService.get.mockReturnValue(of(partialMatchResponse));

      const result = await service.geocodeAddress('Mountain View, CA');

      expect(result).toBeDefined();
      expect(result.formattedAddress).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(
        service.geocodeAddress('1600 Amphitheatre Parkway'),
      ).rejects.toThrow(HttpException);
    });

    it('should encode address in URL', async () => {
      mockHttpService.get.mockReturnValue(of(mockSuccessResponse));

      await service.geocodeAddress('1600 Amphitheatre Parkway, Mountain View, CA');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('address=1600%20Amphitheatre%20Parkway%2C%20Mountain%20View%2C%20CA'),
      );
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('key=test-api-key'),
      );
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('region=us'),
      );
    });
  });

  describe('isUSAddress', () => {
    it('should return true for valid US address', () => {
      const usAddress = {
        formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
        addressComponents: {
          streetNumber: '1600',
          street: 'Amphitheatre Parkway',
          city: 'Mountain View',
          state: 'CA',
          zipCode: '94043',
        },
        location: { lat: 37.4224764, lng: -122.0842499 },
        placeId: 'test',
        types: [],
      };

      const result = service.isUSAddress(usAddress);
      expect(result).toBe(true);
    });

    it('should return false for non-US address', () => {
      const nonUSAddress = {
        formattedAddress: '10 Downing Street, London, UK',
        addressComponents: {
          streetNumber: '10',
          street: 'Downing Street',
          city: 'London',
          state: undefined,
          zipCode: 'SW1A 2AA',
        },
        location: { lat: 51.5034, lng: -0.1276 },
        placeId: 'test',
        types: [],
      };

      const result = service.isUSAddress(nonUSAddress);
      expect(result).toBe(false);
    });

    it('should return false for address without state', () => {
      const addressWithoutState = {
        formattedAddress: 'Some Address',
        addressComponents: {
          streetNumber: '123',
          street: 'Main St',
          city: 'City',
          state: undefined,
          zipCode: '12345',
        },
        location: { lat: 0, lng: 0 },
        placeId: 'test',
        types: [],
      };

      const result = service.isUSAddress(addressWithoutState);
      expect(result).toBe(false);
    });

    it('should return false for address with invalid zip code format', () => {
      const invalidZipAddress = {
        formattedAddress: 'Some Address',
        addressComponents: {
          streetNumber: '123',
          street: 'Main St',
          city: 'City',
          state: 'CA',
          zipCode: 'INVALID',
        },
        location: { lat: 0, lng: 0 },
        placeId: 'test',
        types: [],
      };

      const result = service.isUSAddress(invalidZipAddress);
      expect(result).toBe(false);
    });
  });
});

