/**
 * Test fixtures for address service tests
 * Reusable mock data for consistent testing
 */

import { AddressResponseDto, AddressValidationStatus } from 'src/address/dto/address-response.dto';
import { ValidateAddressDto } from 'src/address/dto/validate-address.dto';

export const mockValidAddressDto: ValidateAddressDto = {
  address: '1600 Amphitheatre Parkway, Mountain View, CA',
};

export const mockValidAddressResponse: AddressResponseDto = {
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
  message: 'Address is valid and properly formatted',
};

export const mockCorrectedAddressResponse: AddressResponseDto = {
  status: AddressValidationStatus.CORRECTED,
  originalAddress: '1600 Amphitheatre Pkwy, Mt View, California',
  standardizedAddress: {
    streetNumber: '1600',
    street: 'Amphitheatre Parkway',
    city: 'Mountain View',
    state: 'CA',
    zipCode: '94043',
    fullAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
  },
  confidence: 0.75,
  corrections: ['Standardized state to: CA', 'Added/formatted zip code: 94043'],
  message: 'Address was corrected: Standardized state to: CA, Added/formatted zip code: 94043',
};

export const mockUnverifiableAddressResponse: AddressResponseDto = {
  status: AddressValidationStatus.UNVERIFIABLE,
  originalAddress: '123 Fake Street, Nowhere, XY',
  standardizedAddress: {},
  confidence: 0,
  message: 'Address could not be found or verified',
};

export const mockTestAddresses = {
  valid: '1600 Amphitheatre Parkway, Mountain View, CA',
  withTypos: '1600 Amphitheatre Pkwy, Mt View, California',
  partial: 'Times Square, New York',
  invalid: '123 Fake Street, Nowhere, XY 99999',
  nonUS: '10 Downing Street, London, UK',
  missingNumber: 'Main Street, Boston, MA',
};

