import { Test, TestingModule } from '@nestjs/testing';
import { AddressController } from 'src/address/address.controller';
import { AddressService } from 'src/address/address.service';
import { ValidateAddressDto } from 'src/address/dto/validate-address.dto';
import {
  AddressResponseDto,
  AddressValidationStatus,
} from 'src/address/dto/address-response.dto';

describe('AddressController', () => {
  let controller: AddressController;
  let service: AddressService;

  const mockAddressService = {
    validateAddress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [
        {
          provide: AddressService,
          useValue: mockAddressService,
        },
      ],
    }).compile();

    controller = module.get<AddressController>(AddressController);
    service = module.get<AddressService>(AddressService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('validateAddress', () => {
    it('should validate address successfully', async () => {
      const mockResponse: AddressResponseDto = {
        status: AddressValidationStatus.VALID,
        originalAddress: '1600 Amphitheatre Parkway, Mountain View, CA',
        standardizedAddress: {
          streetNumber: '1600',
          street: 'Amphitheatre Parkway',
          city: 'Mountain View',
          state: 'CA',
          zipCode: '94043',
          fullAddress:
            '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
        },
        confidence: 0.95,
        message: 'Address is valid and properly formatted',
      };

      mockAddressService.validateAddress.mockResolvedValue(mockResponse);

      const dto: ValidateAddressDto = {
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
      };

      const result = await controller.validateAddress(dto);

      expect(result).toEqual(mockResponse);
      expect(mockAddressService.validateAddress).toHaveBeenCalledWith(dto);
    });

    it('should normalize address input before passing to service', async () => {
      const mockResponse: AddressResponseDto = {
        status: AddressValidationStatus.VALID,
        originalAddress: '1600 Amphitheatre Parkway, Mountain View, CA',
        standardizedAddress: {
          streetNumber: '1600',
          street: 'Amphitheatre Parkway',
          city: 'Mountain View',
          state: 'CA',
          zipCode: '94043',
          fullAddress:
            '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
        },
        confidence: 0.95,
        message: 'Address is valid and properly formatted',
      };

      mockAddressService.validateAddress.mockResolvedValue(mockResponse);

      // Input with extra whitespace
      const dto: ValidateAddressDto = {
        address: '  1600  Amphitheatre   Parkway,  Mountain  View,  CA  ',
      };

      await controller.validateAddress(dto);

      // Service should be called with normalized address
      expect(mockAddressService.validateAddress).toHaveBeenCalledWith({
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockAddressService.validateAddress.mockRejectedValue(error);

      const dto: ValidateAddressDto = {
        address: 'Invalid Address',
      };

      await expect(controller.validateAddress(dto)).rejects.toThrow(error);
    });
  });

  describe('getApiInfo', () => {
    it('should return API information', () => {
      const result = controller.getApiInfo();

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('apiVersion');
      expect(result).toHaveProperty('endpoints');
      expect(result.message).toBe('Address Validation API');
      expect(result.apiVersion).toBe('v1');
    });
  });
});

