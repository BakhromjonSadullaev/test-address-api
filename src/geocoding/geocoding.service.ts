import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import CircuitBreaker from 'opossum';
import {
  GeocodingResult,
  GeocodingApiResponse,
} from './types/geocoding-result.interface';
import { EnvConfig } from '../config/env.validation';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<EnvConfig>,
  ) {
    // API key is validated at startup, so it's guaranteed to exist
    this.apiKey = this.configService.get('GOOGLE_GEOCODING_API_KEY')!;

    // Initialize circuit breaker
    const circuitBreakerOptions = {
      errorThresholdPercentage: this.configService.get(
        'CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE',
      )!,
      timeout: this.configService.get('CIRCUIT_BREAKER_TIMEOUT')!,
      resetTimeout: this.configService.get('CIRCUIT_BREAKER_RESET_TIMEOUT')!,
      rollingCountTimeout: this.configService.get(
        'CIRCUIT_BREAKER_ROLLING_WINDOW',
      )!,
      rollingCountBuckets: 10,
      name: 'GeocodingAPI',
      enabled: true,
      // Only count non-HttpException errors as failures
      // HttpExceptions (BAD_REQUEST, etc.) are expected and shouldn't open circuit
      errorFilter: (error: any) => {
        // Don't count HttpExceptions as circuit breaker failures
        // Return true to filter out (not count as failure), false to count as failure
        if (error instanceof HttpException) {
          return true; // Filter out - don't count as failure
        }
        return false; // Count as failure
      },
    };

    this.circuitBreaker = new CircuitBreaker(
      (address: string) => this.callGeocodingAPI(address),
      circuitBreakerOptions,
    ) as any;

    // Circuit breaker event handlers
    this.circuitBreaker.on('open', () => {
      this.logger.warn(
        'Circuit breaker opened: Geocoding API is failing, requests will be rejected',
      );
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.log(
        'Circuit breaker half-open: Testing if Geocoding API is back online',
      );
    });

    this.circuitBreaker.on('close', () => {
      this.logger.log(
        'Circuit breaker closed: Geocoding API is healthy again',
      );
    });

    this.circuitBreaker.on('failure', (error: any) => {
      // Only log failures that are not expected HttpExceptions
      // HttpExceptions (like BAD_REQUEST) are expected and shouldn't trigger circuit breaker
      if (!(error instanceof HttpException)) {
        this.logger.error(
          `Circuit breaker recorded failure: ${error.message}`,
          error.stack,
        );
      }
    });
  }

  /**
   * Validates and geocodes an address using Google Geocoding API
   * Protected by circuit breaker to prevent cascading failures
   * @param address - Free-form address string
   * @returns GeocodingResult with standardized address components
   */
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    try {
      // Use circuit breaker to protect against external API failures
      return await (this.circuitBreaker.fire(address) as Promise<GeocodingResult>);
    } catch (error: any) {
      // Re-throw HttpException first (from callGeocodingAPI - these are expected errors)
      // This must be checked before circuit breaker errors
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle circuit breaker open state
      // Check for various circuit breaker error indicators
      if (
        error.name === 'CircuitBreakerOpenError' ||
        error.message?.includes('Breaker is open') ||
        error.message?.includes('Circuit breaker is open') ||
        error.code === 'ECIRCUITOPEN'
      ) {
        this.logger.error(
          'Circuit breaker is open: Geocoding API is unavailable',
        );
        throw new HttpException(
          'Geocoding service temporarily unavailable. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Handle other errors (network, timeout, etc.)
      this.logger.error(`Geocoding error: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to geocode address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Internal method that performs the actual API call
   * This is wrapped by the circuit breaker
   * @param address - Free-form address string
   * @returns GeocodingResult with standardized address components
   */
  private async callGeocodingAPI(address: string): Promise<GeocodingResult> {
    try {
      const url = `${this.baseUrl}?address=${encodeURIComponent(
        address,
      )}&key=${this.apiKey}&region=us`;

      const response = await firstValueFrom(
        this.httpService.get<GeocodingApiResponse>(url),
      );

      const data = response.data;

      if (data.status === 'ZERO_RESULTS') {
        throw new HttpException(
          'Invalid address: address could not be found',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (data.status === 'REQUEST_DENIED') {
        this.logger.error(`Geocoding API error: ${data.status}`);
        throw new HttpException(
          'Geocoding service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (data.status !== 'OK' && data.status !== 'PARTIAL_MATCH') {
        this.logger.warn(`Geocoding API returned status: ${data.status}`);
        throw new HttpException(
          'Unable to validate address',
          HttpStatus.BAD_REQUEST,
        );
      }

      // After handling ZERO_RESULTS and ensuring status is OK/PARTIAL_MATCH,
      // results should always exist and have at least one item
      if (data.results.length === 0) {
        throw new HttpException(
          'Invalid address: no results found for the provided address',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = data.results[0];
      return this.parseGeocodingResult(result);
    } catch (error) {
      // Re-throw HttpExceptions (these are expected errors, not circuit breaker failures)
      if (error instanceof HttpException) {
        throw error;
      }
      // For other errors (network, timeout, etc.), let circuit breaker handle them
      throw error;
    }
  }

  /**
   * Parses Google Geocoding API response into structured format
   */
  private parseGeocodingResult(
    result: GeocodingApiResponse['results'][0],
  ): GeocodingResult {
    const addressComponents: GeocodingResult['addressComponents'] = {};

    for (const component of result.address_components) {
      const types = component.types;

      if (types.includes('street_number')) {
        addressComponents.streetNumber = component.long_name;
      } else if (
        types.includes('route') ||
        types.includes('street_address')
      ) {
        addressComponents.street = component.long_name;
      } else if (
        types.includes('locality') ||
        types.includes('sublocality')
      ) {
        addressComponents.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressComponents.state = component.short_name;
      } else if (types.includes('postal_code')) {
        addressComponents.zipCode = component.long_name;
      }
    }

    return {
      formattedAddress: result.formatted_address,
      addressComponents,
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
      placeId: result.place_id,
      types: result.types,
    };
  }

  /**
   * Checks if the geocoded result is a US address
   */
  isUSAddress(result: GeocodingResult): boolean {
    if (result.addressComponents.state && result.addressComponents.zipCode) {
      const zipCode = result.addressComponents.zipCode;
      return /^\d{5}(-\d{4})?$/.test(zipCode);
    }
    return false;
  }
}

