import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GeocodingService } from '../geocoding/geocoding.service';
import {
  AddressResponseDto,
  AddressValidationStatus,
} from './dto/address-response.dto';
import { ValidateAddressDto } from './dto/validate-address.dto';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    private readonly geocodingService: GeocodingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Validates and standardizes a property address
   * @param dto - Address validation request DTO
   * @returns Standardized address response
   */
  async validateAddress(
    dto: ValidateAddressDto,
  ): Promise<AddressResponseDto> {
    // Address is already normalized at controller level
    const address = dto.address;

    // Check cache first
    const cacheKey = `address:${address}`;
    const cached = await this.cacheManager.get<AddressResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for address: ${address}`);
      return cached;
    }

    try {
      const geocodingResult = await this.geocodingService.geocodeAddress(
        address,
      );

      if (!this.geocodingService.isUSAddress(geocodingResult)) {
        const response: AddressResponseDto = {
          status: AddressValidationStatus.UNVERIFIABLE,
          originalAddress: dto.address,
          standardizedAddress: {},
          confidence: 0,
          message: 'Address is not a valid US address',
        };

        await this.cacheManager.set(cacheKey, response, 300 * 1000); // 5 minutes
        return response;
      }

      const { status, confidence, corrections } = this.analyzeValidation(
        address,
        geocodingResult,
      );

      const response: AddressResponseDto = {
        status,
        originalAddress: dto.address,
        standardizedAddress: {
          streetNumber: geocodingResult.addressComponents.streetNumber,
          street: geocodingResult.addressComponents.street,
          city: geocodingResult.addressComponents.city,
          state: geocodingResult.addressComponents.state,
          zipCode: geocodingResult.addressComponents.zipCode,
          fullAddress: geocodingResult.formattedAddress,
        },
        confidence,
        corrections: corrections.length > 0 ? corrections : undefined,
        message: this.getStatusMessage(status, corrections),
      };

      await this.cacheManager.set(cacheKey, response);
      this.logger.debug(`Cached address validation result for: ${address}`);

      return response;
    } catch (error) {
      this.logger.error(`Address validation error: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        // Handle invalid address errors (BAD_REQUEST) from geocoding service
        if (error.getStatus() === HttpStatus.BAD_REQUEST) {
          return {
            status: AddressValidationStatus.UNVERIFIABLE,
            originalAddress: dto.address,
            standardizedAddress: {},
            confidence: 0,
            message: error.message || 'Address could not be found or verified',
          };
        }
        throw error;
      }

      return {
        status: AddressValidationStatus.UNVERIFIABLE,
        originalAddress: dto.address,
        standardizedAddress: {},
        confidence: 0,
        message: 'An error occurred while validating the address',
      };
    }
  }

  /**
   * Analyzes the validation result to determine status and confidence
   */
  private analyzeValidation(
    original: string,
    geocodingResult: any,
  ): {
    status: AddressValidationStatus;
    confidence: number;
    corrections: string[];
  } {
    const normalizedOriginal = original.toLowerCase();
    const normalizedFormatted = geocodingResult.formattedAddress.toLowerCase();
    const similarity = this.calculateSimilarity(normalizedOriginal, normalizedFormatted);

    // High similarity means address is valid as-is
    if (this.isHighSimilarity(similarity)) {
      return {
        status: AddressValidationStatus.VALID,
        confidence: similarity,
        corrections: [],
      };
    }

    // Collect corrections and adjust confidence
    const corrections: string[] = [];
    let confidence = 1.0;

    confidence = this.checkStreetNumberCorrection(
      original,
      geocodingResult,
      corrections,
      confidence,
    );
    confidence = this.checkStateCorrection(
      normalizedOriginal,
      geocodingResult,
      corrections,
      confidence,
    );
    confidence = this.checkZipCodeCorrection(
      original,
      geocodingResult,
      corrections,
      confidence,
    );

    // Determine final status and adjust confidence based on similarity
    const status = this.determineStatus(similarity, confidence);
    confidence = this.adjustConfidenceBySimilarity(similarity, confidence);

    return { status, confidence, corrections };
  }

  /**
   * Checks if similarity is high enough to consider address valid
   */
  private isHighSimilarity(similarity: number): boolean {
    return similarity > 0.9;
  }

  /**
   * Checks if street number was added and records correction
   */
  private checkStreetNumberCorrection(
    original: string,
    geocodingResult: any,
    corrections: string[],
    confidence: number,
  ): number {
    const streetNumber = geocodingResult.addressComponents.streetNumber;
    if (!streetNumber) {
      return confidence;
    }

    const hasNumber = /\d+/.test(original);
    if (!hasNumber) {
      corrections.push(`Added street number: ${streetNumber}`);
      return confidence - 0.1;
    }

    return confidence;
  }

  /**
   * Checks if state was standardized and records correction
   */
  private checkStateCorrection(
    normalizedOriginal: string,
    geocodingResult: any,
    corrections: string[],
    confidence: number,
  ): number {
    const stateAbbrev = geocodingResult.addressComponents.state;
    if (!stateAbbrev) {
      return confidence;
    }

    if (!normalizedOriginal.includes(stateAbbrev.toLowerCase())) {
      corrections.push(`Standardized state to: ${stateAbbrev}`);
      return confidence - 0.05;
    }

    return confidence;
  }

  /**
   * Checks if zip code was added or formatted and records correction
   */
  private checkZipCodeCorrection(
    original: string,
    geocodingResult: any,
    corrections: string[],
    confidence: number,
  ): number {
    const zipCode = geocodingResult.addressComponents.zipCode;
    if (!zipCode) {
      return confidence;
    }

    if (!original.includes(zipCode)) {
      corrections.push(`Added/formatted zip code: ${zipCode}`);
      return confidence - 0.05;
    }

    return confidence;
  }

  /**
   * Determines validation status based on similarity
   */
  private determineStatus(
    similarity: number,
    _confidence: number,
  ): AddressValidationStatus {
    if (similarity > 0.7) {
      return AddressValidationStatus.CORRECTED;
    }

    if (similarity > 0.5) {
      return AddressValidationStatus.CORRECTED;
    }

    return AddressValidationStatus.UNVERIFIABLE;
  }

  /**
   * Adjusts confidence based on similarity thresholds
   */
  private adjustConfidenceBySimilarity(
    similarity: number,
    confidence: number,
  ): number {
    if (similarity > 0.7) {
      return Math.max(0.7, confidence);
    }

    if (similarity > 0.5) {
      return Math.max(0.5, confidence);
    }

    return similarity;
  }

  /**
   * Calculates similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(
      longer.toLowerCase(),
      shorter.toLowerCase(),
    );
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generates a user-friendly status message
   */
  private getStatusMessage(
    status: AddressValidationStatus,
    corrections: string[],
  ): string {
    switch (status) {
      case AddressValidationStatus.VALID:
        return 'Address is valid and properly formatted';
      case AddressValidationStatus.CORRECTED:
        return `Address was corrected: ${corrections.join(', ')}`;
      case AddressValidationStatus.UNVERIFIABLE:
        return 'Address could not be verified';
      default:
        return 'Unknown validation status';
    }
  }
}

