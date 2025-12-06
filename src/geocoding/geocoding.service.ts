import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import CircuitBreaker from 'opossum';
import {
  GeocodingResult,
  CensusGeocodingApiResponse,
} from './types/geocoding-result.interface';
import { EnvConfig } from '../config/env.validation';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<EnvConfig>,
  ) {
    this.baseUrl = this.configService.get('GEOCODING_API_URL')!;
    this.apiKey = this.configService.get('GEOCODING_API_KEY');

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
      errorFilter: (error: unknown) => {
        if (error instanceof HttpException) {
          return true;
        }
        return false;
      },
    };

    this.circuitBreaker = new CircuitBreaker(
      (address: string) => this.callGeocodingAPI(address),
      circuitBreakerOptions,
    );

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

    this.circuitBreaker.on('failure', (error: unknown) => {
      if (!(error instanceof HttpException)) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Circuit breaker recorded failure: ${errorMessage}`,
          errorStack,
        );
      }
    });
  }

  /**
   * Validates and geocodes an address using US Census Geocoding API
   * Protected by circuit breaker to prevent cascading failures
   * @param address - Free-form address string
   * @returns GeocodingResult with standardized address components
   */
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    try {
      const result = await this.circuitBreaker.fire(address);
      if (!result || typeof result !== 'object' || !('formattedAddress' in result)) {
        throw new HttpException(
          'Invalid response from geocoding service',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return result as GeocodingResult;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));
      const errorName = errorObj.name;
      const errorMessage = errorObj.message;
      const errorCode = 'code' in errorObj ? (errorObj.code as string) : undefined;

      if (
        errorName === 'CircuitBreakerOpenError' ||
        errorMessage?.includes('Breaker is open') ||
        errorMessage?.includes('Circuit breaker is open') ||
        errorCode === 'ECIRCUITOPEN'
      ) {
        this.logger.error(
          'Circuit breaker is open: Geocoding API is unavailable',
        );
        throw new HttpException(
          'Geocoding service temporarily unavailable. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      this.logger.error(`Geocoding error: ${errorMessage}`, errorObj.stack);
      throw new HttpException(
        'Failed to geocode address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Internal method that performs the actual API call to US Census Geocoding API
   * This is wrapped by the circuit breaker
   * @param address - Free-form address string
   * @returns GeocodingResult with standardized address components
   */
  private async callGeocodingAPI(address: string): Promise<GeocodingResult> {
    try {
      const params = new URLSearchParams({
        address: address,
        format: 'json',
        benchmark: 'Public_AR_Current',
      });

      if (this.apiKey) {
        params.append('key', this.apiKey);
      }

      const url = `${this.baseUrl}?${params.toString()}`;

      const response = await firstValueFrom(
        this.httpService.get<CensusGeocodingApiResponse>(url),
      );

      const data = response.data;

      if (!data.result || !data.result.addressMatches || data.result.addressMatches.length === 0) {
        throw new HttpException(
          'Invalid address: address could not be found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const match = data.result.addressMatches[0];
      return this.parseCensusGeocodingResult(match, address);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Census Geocoding API error: ${errorObj.message}`, errorObj.stack);
      
      if (errorObj.message.includes('timeout') || errorObj.message.includes('ECONNREFUSED')) {
        throw new HttpException(
          'Geocoding service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'Unable to validate address',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Parses US Census Geocoding API response into structured format
   */
  private parseCensusGeocodingResult(
    match: CensusGeocodingApiResponse['result']['addressMatches'][0],
    originalAddress: string,
  ): GeocodingResult {
    const addressFields = match.addressFields;
    const addressComponents = match.addressComponents;

    const streetNumber = addressComponents.fromAddress || addressComponents.toAddress;
    const streetName = addressComponents.streetName || '';
    const preDirection = addressComponents.preDirection || '';
    const postDirection = addressComponents.postDirection || '';
    const streetSuffix = addressComponents.streetSuffix || '';

    const fullStreet = [preDirection, streetName, streetSuffix, postDirection]
      .filter(Boolean)
      .join(' ')
      .trim();

    const formattedAddress = [
      streetNumber ? `${streetNumber} ${fullStreet}` : fullStreet,
      addressFields.City,
      addressFields.State,
      addressFields.Zip,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      formattedAddress: formattedAddress || match.matchedAddress,
      addressComponents: {
        streetNumber: streetNumber || undefined,
        street: fullStreet || addressFields.Street || undefined,
        city: addressFields.City || undefined,
        state: addressFields.State || undefined,
        zipCode: addressFields.Zip || undefined,
      },
      location: {
        lat: match.coordinates.y,
        lng: match.coordinates.x,
      },
      placeId: match.tigerLine?.tigerLineId || `census-${match.coordinates.x}-${match.coordinates.y}`,
      types: ['street_address'],
    };
  }

  /**
   * Checks if the geocoded result is a US address
   * Census API only returns US addresses, so this always returns true if we have state and zip
   */
  isUSAddress(result: GeocodingResult): boolean {
    if (result.addressComponents.state && result.addressComponents.zipCode) {
      const zipCode = result.addressComponents.zipCode;
      return /^\d{5}(-\d{4})?$/.test(zipCode);
    }
    return false;
  }
}
