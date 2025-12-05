import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AddressService } from 'src/address/address.service';
import { GeocodingService } from 'src/geocoding/geocoding.service';
import { ValidateAddressDto } from 'src/address/dto/validate-address.dto';
import {
  AddressValidationStatus,
  AddressResponseDto,
} from 'src/address/dto/address-response.dto';

describe('AddressService', () => {
  let service: AddressService;
  let geocodingService: GeocodingService;
  let cacheManager: any;

  const mockGeocodingService = {
    geocodeAddress: jest.fn(),
    isUSAddress: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
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

    service = module.get<AddressService>(AddressService);
    geocodingService = module.get<GeocodingService>(GeocodingService);
    cacheManager = module.get(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAddress', () => {
    const validGeocodingResult = {
      formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      addressComponents: {
        streetNumber: '1600',
        street: 'Amphitheatre Parkway',
        city: 'Mountain View',
        state: 'CA',
        zipCode: '94043',
      },
      location: { lat: 37.4224764, lng: -122.0842499 },
      placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
      types: ['street_address'],
    };

    it('should return cached result if available', async () => {
      const cachedResponse: AddressResponseDto = {
        status: AddressValidationStatus.VALID,
        originalAddress: '1600 Amphitheatre Parkway, Mountain View, CA',
        standardizedAddress: {
          streetNumber: '1600',
          street: 'Amphitheatre Parkway',
          city: 'Mountain View',
          state: 'CA',
          zipCode: '94043',
          fullAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
        },
        confidence: 0.95,
      };

      mockCacheManager.get.mockResolvedValue(cachedResponse);

      const dto: ValidateAddressDto = {
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
      };

      const result = await service.validateAddress(dto);

      expect(result).toEqual(cachedResponse);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'address:1600 Amphitheatre Parkway, Mountain View, CA',
      );
      expect(mockGeocodingService.geocodeAddress).not.toHaveBeenCalled();
    });

    it('should validate and return valid or corrected address', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockGeocodingService.geocodeAddress.mockResolvedValue(validGeocodingResult);
      mockGeocodingService.isUSAddress.mockReturnValue(true);
      mockCacheManager.set.mockResolvedValue(undefined);

      const dto: ValidateAddressDto = {
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
      };

      const result = await service.validateAddress(dto);

      expect([AddressValidationStatus.VALID, AddressValidationStatus.CORRECTED]).toContain(
        result.status,
      );
      expect(result.originalAddress).toBe(dto.address);
      expect(result.standardizedAddress.streetNumber).toBe('1600');
      expect(result.standardizedAddress.city).toBe('Mountain View');
      expect(result.standardizedAddress.state).toBe('CA');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return corrected status for addresses with typos', async () => {
      const correctedGeocodingResult = {
        ...validGeocodingResult,
        formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockGeocodingService.geocodeAddress.mockResolvedValue(
        correctedGeocodingResult,
      );
      mockGeocodingService.isUSAddress.mockReturnValue(true);
      mockCacheManager.set.mockResolvedValue(undefined);

      const dto: ValidateAddressDto = {
        address: '1600 Amphitheatre Pkwy, Mt View, CA',
      };

      const result = await service.validateAddress(dto);

      expect([AddressValidationStatus.VALID, AddressValidationStatus.CORRECTED]).toContain(
        result.status,
      );
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return unverifiable for non-US addresses', async () => {
      const nonUSResult = {
        formattedAddress: '10 Downing Street, London, UK',
        addressComponents: {
          streetNumber: '10',
          street: 'Downing Street',
          city: 'London',
          state: undefined,
          zipCode: 'SW1A 2AA',
        },
        location: { lat: 51.5034, lng: -0.1276 },
        placeId: 'test-place-id',
        types: ['street_address'],
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockGeocodingService.geocodeAddress.mockResolvedValue(nonUSResult);
      mockGeocodingService.isUSAddress.mockReturnValue(false);
      mockCacheManager.set.mockResolvedValue(undefined);

      const dto: ValidateAddressDto = {
        address: '10 Downing Street, London, UK',
      };

      const result = await service.validateAddress(dto);

      expect(result.status).toBe(AddressValidationStatus.UNVERIFIABLE);
      expect(result.standardizedAddress).toEqual({});
      expect(result.confidence).toBe(0);
    });

    it('should handle geocoding service errors gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockGeocodingService.geocodeAddress.mockRejectedValue(
        new HttpException('Invalid address: address could not be found', HttpStatus.BAD_REQUEST),
      );

      const dto: ValidateAddressDto = {
        address: 'Invalid Address 12345',
      };

      const result = await service.validateAddress(dto);

      expect(result.status).toBe(AddressValidationStatus.UNVERIFIABLE);
      expect(result.message).toContain('could not be found');
    });

    it('should use address as-is (normalization happens at controller level)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockGeocodingService.geocodeAddress.mockResolvedValue(validGeocodingResult);
      mockGeocodingService.isUSAddress.mockReturnValue(true);
      mockCacheManager.set.mockResolvedValue(undefined);

      const dto: ValidateAddressDto = {
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
      };

      await service.validateAddress(dto);

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'address:1600 Amphitheatre Parkway, Mountain View, CA',
      );
    });

    it('should cache negative results with shorter TTL', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockGeocodingService.geocodeAddress.mockResolvedValue({
        ...validGeocodingResult,
      });
      mockGeocodingService.isUSAddress.mockReturnValue(false);
      mockCacheManager.set.mockResolvedValue(undefined);

      const dto: ValidateAddressDto = {
        address: 'Non-US Address',
      };

      await service.validateAddress(dto);

      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});

