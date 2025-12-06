import { z } from 'zod';

/**
 * Environment variables validation schema
 * This ensures all required environment variables are present and valid
 * before the application starts
 */
export const envValidationSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  GEOCODING_API_URL: z
    .string()
    .url('GEOCODING_API_URL must be a valid URL')
    .default('https://geocoding.geo.census.gov/geocoder/locations/address')
    .describe('Geocoding API base URL (defaults to US Census Geocoding API)'),
  GEOCODING_API_KEY: z
    .string()
    .optional()
    .describe('Geocoding API key (optional, not required for Census API)'),

  RATE_LIMIT_TTL: z
    .string()
    .default('60')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

  REDIS_TTL: z
    .string()
    .default('3600')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

  REDIS_HOST: z
    .string()
    .default('')
    .describe('Redis host (leave empty to use in-memory cache)'),
  REDIS_PORT: z
    .string()
    .default('6379')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .describe('Redis port'),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .describe('Redis password (if required)'),
  REDIS_TLS: z
    .string()
    .default('false')
    .transform((val) => val.toLowerCase() === 'true')
    .pipe(z.boolean())
    .describe('Enable TLS for Redis connection'),

  CORS_ORIGIN: z
    .string()
    .default('*')
    .describe(
      'Comma-separated list of allowed origins, or "*" for all origins',
    ),
  CORS_CREDENTIALS: z
    .string()
    .default('false')
    .transform((val) => val.toLowerCase() === 'true')
    .pipe(z.boolean())
    .describe('Whether to allow credentials in CORS requests'),
  CORS_METHODS: z
    .string()
    .default('GET,HEAD,PUT,PATCH,POST,DELETE')
    .describe('Comma-separated list of allowed HTTP methods'),
  CORS_ALLOWED_HEADERS: z
    .string()
    .default('Content-Type,Authorization')
    .describe('Comma-separated list of allowed headers'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info')
    .describe('Log level (fatal, error, warn, info, debug, trace)'),
  LOG_FORMAT: z
    .enum(['json', 'pretty'])
    .default('json')
    .describe('Log format: json for production, pretty for development'),

  CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE: z
    .string()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0).max(100))
    .describe('Error threshold percentage to open circuit (0-100)'),
  CIRCUIT_BREAKER_TIMEOUT: z
    .string()
    .default('10000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .describe('Timeout in milliseconds for circuit breaker operations'),
  CIRCUIT_BREAKER_RESET_TIMEOUT: z
    .string()
    .default('30000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .describe('Time in milliseconds before attempting to close circuit'),
  CIRCUIT_BREAKER_ROLLING_WINDOW: z
    .string()
    .default('10000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .describe('Time window in milliseconds for error rate calculation'),
});

/**
 * Type inference from the validation schema
 * This allows TypeScript to infer types from the zod schema
 */
export type EnvConfig = z.infer<typeof envValidationSchema>;

