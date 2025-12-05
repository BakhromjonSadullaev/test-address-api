import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AddressService } from './address.service';
import { ValidateAddressDto } from './dto/validate-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';

@ApiTags('address')
@Controller({
  path: 'validate-address',
  version: '1',
})
export class AddressController {
  private readonly logger = new Logger(AddressController.name);

  constructor(private readonly addressService: AddressService) {}

  @Get('info')
  @ApiTags('general')
  @ApiOperation({
    summary: 'Get API information',
    description: 'Returns basic information about the API and available endpoints',
  })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully',
  })
  getApiInfo() {
    return {
      message: 'Address Validation API',
      version: '1.0.0',
      apiVersion: 'v1',
      endpoints: {
        'POST /v1/validate-address': 'Validate and standardize a US property address',
        'GET /v1/validate-address/info': 'Get API information',
        'GET /health': 'Health check endpoint',
      },
      example: {
        method: 'POST',
        url: '/v1/validate-address',
        body: {
          address: '1600 Amphitheatre Parkway, Mountain View, CA',
        },
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({
    summary: 'Validate and standardize address',
    description:
      'Validates and standardizes a US property address. Handles partial addresses, typos, and returns structured address components with validation status.',
  })
  @ApiBody({
    type: ValidateAddressDto,
    description: 'Address to validate',
    examples: {
      valid: {
        summary: 'Valid address example',
        value: {
          address: '1600 Amphitheatre Parkway, Mountain View, CA',
        },
      },
      withTypos: {
        summary: 'Address with typos',
        value: {
          address: '1600 Amphitheatre Pkwy, Mt View, California',
        },
      },
      partial: {
        summary: 'Partial address',
        value: {
          address: 'Times Square, New York',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Address validated successfully',
    type: AddressResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - address is required or too long',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['address should not be empty'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        message: { type: 'string', example: 'ThrottlerException: Too Many Requests' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
      },
    },
  })
  async validateAddress(
    @Body() dto: ValidateAddressDto,
  ): Promise<AddressResponseDto> {
    // Normalize address input at controller level
    const normalizedAddress = this.normalizeInput(dto.address);
    this.logger.log(`Validating address: ${normalizedAddress}`);
    
    // Create new DTO with normalized address
    const normalizedDto: ValidateAddressDto = {
      address: normalizedAddress,
    };
    
    return this.addressService.validateAddress(normalizedDto);
  }

  /**
   * Normalizes input address for consistent processing
   * Trims whitespace and collapses multiple spaces into single space
   */
  private normalizeInput(address: string): string {
    return address.trim().replace(/\s+/g, ' ');
  }
}

