import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AddressValidationStatus {
  VALID = 'valid',
  CORRECTED = 'corrected',
  UNVERIFIABLE = 'unverifiable',
}

export class StandardizedAddressDto {
  @ApiPropertyOptional({
    description: 'Street number',
    example: '1600',
  })
  streetNumber?: string;

  @ApiPropertyOptional({
    description: 'Street name',
    example: 'Amphitheatre Parkway',
  })
  street?: string;

  @ApiPropertyOptional({
    description: 'City name',
    example: 'Mountain View',
  })
  city?: string;

  @ApiPropertyOptional({
    description: 'State abbreviation',
    example: 'CA',
  })
  state?: string;

  @ApiPropertyOptional({
    description: 'ZIP code',
    example: '94043',
  })
  zipCode?: string;

  @ApiPropertyOptional({
    description: 'Full formatted address',
    example: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
  })
  fullAddress?: string;
}

export class AddressResponseDto {
  @ApiProperty({
    description: 'Validation status of the address',
    enum: AddressValidationStatus,
    example: AddressValidationStatus.VALID,
  })
  status: AddressValidationStatus;

  @ApiProperty({
    description: 'Original address as provided by the user',
    example: '1600 Amphitheatre Parkway, Mountain View, CA',
  })
  originalAddress: string;

  @ApiProperty({
    description: 'Standardized address components',
    type: StandardizedAddressDto,
  })
  standardizedAddress: StandardizedAddressDto;

  @ApiProperty({
    description: 'Confidence score (0-1) indicating confidence in the validation',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  confidence: number;

  @ApiPropertyOptional({
    description: 'List of corrections made if status is CORRECTED',
    example: ['Standardized state to: CA', 'Added/formatted zip code: 94043'],
    type: [String],
  })
  corrections?: string[];

  @ApiPropertyOptional({
    description: 'Additional information about the validation result',
    example: 'Address is valid and properly formatted',
  })
  message?: string;
}
