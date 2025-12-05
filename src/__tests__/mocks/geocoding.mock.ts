/**
 * Geocoding service mock for testing
 */

import { GeocodingResult } from 'src/geocoding/types/geocoding-result.interface';
import { mockValidGeocodingResult } from '../fixtures/geocoding.fixtures';

export const createGeocodingServiceMock = () => ({
  geocodeAddress: jest.fn().mockResolvedValue(mockValidGeocodingResult),
  isUSAddress: jest.fn().mockReturnValue(true),
});

