/**
 * Test fixtures for geocoding service tests
 * Reusable mock data for consistent testing
 */

import { GeocodingResult } from 'src/geocoding/types/geocoding-result.interface';
import { GeocodingApiResponse } from 'src/geocoding/types/geocoding-result.interface';

export const mockValidGeocodingResult: GeocodingResult = {
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

export const mockNonUSGeocodingResult: GeocodingResult = {
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

export const mockLegacyApiSuccessResponse: GeocodingApiResponse = {
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
};

export const mockLegacyApiZeroResultsResponse: GeocodingApiResponse = {
  status: 'ZERO_RESULTS',
  results: [],
};

export const mockLegacyApiRequestDeniedResponse: GeocodingApiResponse = {
  status: 'REQUEST_DENIED',
  results: [],
};

