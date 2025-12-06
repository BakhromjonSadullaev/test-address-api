import { Controller, Get, VERSION_NEUTRAL, HttpStatus, HttpException, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@ApiTags('health')
@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(
    private readonly geocodingService: GeocodingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the health status of the API service and US Census Geocoding API',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        service: { type: 'string', example: 'address-validation-api' },
        checks: {
          type: 'object',
          properties: {
            service: { type: 'object', properties: { status: { type: 'string' } } },
            geocodingApi: { type: 'object', properties: { status: { type: 'string' }, responseTime: { type: 'number' } } },
            cache: { type: 'object', properties: { status: { type: 'string' } } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy',
  })
  async healthCheck() {
    const timestamp = new Date().toISOString();
    const checks: {
      service: { status: string };
      geocodingApi: { status: string; responseTime?: number; error?: string };
      cache: { status: string; type?: string };
    } = {
      service: { status: 'ok' },
      geocodingApi: { status: 'unknown' },
      cache: { status: 'unknown' },
    };

    // Check service (always ok if we can respond)
    checks.service.status = 'ok';

    // Check cache
    try {
      const testKey = 'health-check-test';
      await this.cacheManager.set(testKey, 'test', 1000);
      const cached = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);
      
      if (cached === 'test') {
        checks.cache.status = 'ok';
        // Try to determine cache type (Redis vs in-memory)
        // This is a simple heuristic - Redis typically has better performance
        checks.cache.type = 'operational';
      } else {
        checks.cache.status = 'degraded';
      }
    } catch (error) {
      checks.cache.status = 'error';
    }

    // Check Geocoding API with a simple test address
    const geocodingApiStartTime = Date.now();
    try {
      // Use a well-known US address for health check
      const testAddress = '1600 Pennsylvania Avenue NW, Washington, DC 20500';
      
      // Add timeout to prevent hanging (5 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), 5000);
      });
      
      await Promise.race([
        this.geocodingService.geocodeAddress(testAddress),
        timeoutPromise,
      ]);
      
      const responseTime = Date.now() - geocodingApiStartTime;
      checks.geocodingApi.status = 'ok';
      checks.geocodingApi.responseTime = responseTime;
    } catch (error: unknown) {
      const responseTime = Date.now() - geocodingApiStartTime;
      checks.geocodingApi.status = 'error';
      checks.geocodingApi.responseTime = responseTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      checks.geocodingApi.error = errorMessage;
    }

    // Determine overall status
    const isHealthy =
      checks.service.status === 'ok' &&
      checks.geocodingApi.status === 'ok' &&
      checks.cache.status !== 'error';

    const response = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp,
      service: 'address-validation-api',
      checks,
    };

    // Return 503 if unhealthy, 200 if healthy
    if (!isHealthy) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }
}

