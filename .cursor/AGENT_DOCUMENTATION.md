# Agent Documentation - Address Validation API

This document provides comprehensive information about the Address Validation API project for AI agents to understand the codebase, architecture, and development patterns.

## 📋 Project Overview

**Project Name:** Address Validation API  
**Type:** REST API Backend Service  
**Purpose:** Validates and standardizes US property addresses using US Census Geocoding API (free, public service)  
**Framework:** NestJS 10.x with TypeScript 5.x  
**Language:** TypeScript

### Core Functionality
- Validates free-form address text input
- Standardizes addresses to structured format (street, city, state, ZIP)
- Handles edge cases: typos, partial addresses, unverifiable addresses
- Returns validation status: `valid`, `corrected`, or `unverifiable`
- Provides confidence scores and correction details

## 🏗️ Technology Stack

### Core Framework & Runtime
- **NestJS 10.x** - Progressive Node.js framework
- **TypeScript 5.x** - Type-safe JavaScript
- **Node.js** - Runtime environment (v18+)

### Key Dependencies
- **@nestjs/axios** - HTTP client for external API calls
- **@nestjs/cache-manager** - Caching layer (in-memory or Redis)
- **@nestjs/config** - Configuration management
- **@nestjs/swagger** - OpenAPI/Swagger documentation
- **@nestjs/throttler** - Rate limiting
- **class-validator** - DTO validation
- **zod** - Environment variable validation
- **pino** / **nestjs-pino** - Structured JSON logging
- **helmet** - Security headers middleware
- **opossum** - Circuit breaker pattern
- **cache-manager-redis-yet** - Redis cache adapter

### Development Tools
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 📁 Project Structure

```
test-adress-api/
├── src/
│   ├── main.ts                          # Application bootstrap & configuration
│   ├── app.module.ts                    # Root module (global config)
│   ├── app.controller.ts                # Root endpoint handler (/)
│   ├── config/                          # Configuration files
│   │   ├── env.validation.ts           # Zod schema for env vars
│   │   └── logger.config.ts            # Pino logger configuration
│   ├── address/                         # Address validation module
│   │   ├── address.controller.ts       # REST endpoints
│   │   ├── address.service.ts          # Business logic
│   │   └── dto/                        # Data Transfer Objects
│   │       ├── validate-address.dto.ts
│   │       └── address-response.dto.ts
│   ├── geocoding/                      # Geocoding service module
│   │   ├── geocoding.service.ts        # US Census Geocoding API integration
│   │   └── types/
│   │       └── geocoding-result.interface.ts
│   ├── health/                          # Health check module
│   │   └── health.controller.ts        # Health endpoint
│   └── __tests__/                       # Test suite
│       ├── unit/                       # Unit tests
│       ├── e2e/                        # End-to-end tests
│       ├── fixtures/                   # Test data
│       ├── mocks/                      # Mock implementations
│       └── utils/                      # Test utilities
├── .cursor/                            # AI agent documentation (this folder)
├── Dockerfile                          # Production container
├── Dockerfile.dev                      # Development container
├── docker-compose.yml                  # Production compose
├── docker-compose.dev.yml              # Development compose
├── .env.example                        # Environment template
├── package.json                        # Dependencies & scripts
└── tsconfig.json                       # TypeScript config
```

## 🎯 Architecture & Design Patterns

### Module Structure
The application follows NestJS modular architecture:

1. **AppModule** - Root module containing:
   - Global configuration (ConfigModule)
   - Logging (LoggerModule)
   - Rate limiting (ThrottlerModule)
   - Caching (CacheModule)
   - HTTP client (HttpModule)
   - All controllers and services

2. **Address Module** - Core business logic:
   - `AddressController` - Handles HTTP requests
   - `AddressService` - Validation logic, caching, status determination

3. **Geocoding Module** - External API integration:
   - `GeocodingService` - US Census Geocoding API wrapper
   - Circuit breaker protection
   - Error handling

4. **Health Module** - System health checks:
   - `HealthController` - Health endpoint

### Key Design Patterns

#### 1. Service Layer Separation
- `GeocodingService` is separate from `AddressService` for:
  - Easy provider swapping
  - Multiple provider support (future)
  - Clear separation of concerns

#### 2. Circuit Breaker Pattern
- Protects against cascading failures
- Uses `opossum` library
- Configuration via environment variables
- Only counts network/timeout errors (not HttpExceptions)

#### 3. Caching Strategy
- **Default**: In-memory cache (single instance)
- **Optional**: Redis cache (distributed, multi-instance)
- Cache key: `address:{normalizedAddress}`
- TTL: 1 hour for valid/corrected, 5 minutes for unverifiable

#### 4. Rate Limiting
- Global: 100 requests per 60 seconds (configurable)
- Endpoint-specific limits via `@Throttle()` decorator
- Uses `@nestjs/throttler`

#### 5. Validation Status Logic
- **VALID**: Similarity > 0.9 (minimal/no changes)
- **CORRECTED**: Similarity 0.5-0.9 (address modified but verified)
- **UNVERIFIABLE**: Similarity < 0.5 or not a US address

#### 6. Confidence Scoring
- Uses Levenshtein distance for similarity calculation
- Adjusted based on specific corrections made
- Range: 0.0 to 1.0

## 🔌 API Endpoints

### Base URL
- Development: `http://localhost:3000`
- Production: Configured via environment

### API Versioning
- URL-based versioning: `/v1/...`
- Default version: v1 (can omit `/v1/` prefix)

### Available Endpoints

#### 1. `GET /`
**Purpose:** Root endpoint with API information  
**Response:**
```json
{
  "message": "Address Validation API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "GET /health",
    "documentation": "GET /api",
    "validateAddress": "POST /v1/validate-address",
    "apiInfo": "GET /v1/validate-address/info"
  }
}
```

#### 2. `GET /health`
**Purpose:** Health check endpoint  
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "address-validation-api"
}
```

#### 3. `GET /api`
**Purpose:** Swagger UI documentation  
**Access:** Interactive API documentation interface

#### 4. `POST /v1/validate-address`
**Purpose:** Validate and standardize an address  
**Request Body:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Response (Valid):**
```json
{
  "status": "valid",
  "originalAddress": "1600 Amphitheatre Parkway, Mountain View, CA",
  "standardizedAddress": {
    "streetNumber": "1600",
    "street": "Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "zipCode": "94043",
    "fullAddress": "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
  },
  "confidence": 0.95,
  "message": "Address is valid and properly formatted"
}
```

**Response (Corrected):**
```json
{
  "status": "corrected",
  "originalAddress": "1600 Amphitheatre Pkwy, Mt View, California",
  "standardizedAddress": { /* ... */ },
  "confidence": 0.85,
  "corrections": [
    "Standardized state to: CA",
    "Added/formatted zip code: 94043"
  ],
  "message": "Address was corrected: ..."
}
```

**Response (Unverifiable):**
```json
{
  "status": "unverifiable",
  "originalAddress": "Invalid Address",
  "standardizedAddress": {},
  "confidence": 0,
  "message": "Address could not be verified"
}
```

#### 5. `GET /v1/validate-address/info`
**Purpose:** Get API information and examples  
**Response:** API documentation and usage examples

## ⚙️ Configuration

### Environment Variables

All environment variables are validated at startup using Zod. Missing or invalid variables will prevent the application from starting.

#### Required Variables
- None (US Census Geocoding API is used by default, no API key required)

#### Optional Variables (with defaults)

**Geocoding API:**
- `GEOCODING_API_URL` - Geocoding API base URL (default: `https://geocoding.geo.census.gov/geocoder/locations/address`)
- `GEOCODING_API_KEY` - Geocoding API key (optional, not required for Census API)

**Server Configuration:**
- `PORT` - Server port (default: `3000`)
- `NODE_ENV` - Environment: `development`, `production`, `test` (default: `development`)

**Rate Limiting:**
- `RATE_LIMIT_TTL` - Time window in seconds (default: `60`)
- `RATE_LIMIT_MAX` - Max requests per window (default: `100`)

**Caching:**
- `REDIS_TTL` - Cache TTL in seconds (default: `3600`)
- `REDIS_HOST` - Redis host (empty = in-memory cache) (default: ``)
- `REDIS_PORT` - Redis port (default: `6379`)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_TLS` - Enable TLS (default: `false`)

**CORS:**
- `CORS_ORIGIN` - Allowed origins, comma-separated or `*` (default: `*`)
- `CORS_CREDENTIALS` - Allow credentials (default: `false`)
- `CORS_METHODS` - Allowed methods (default: `GET,HEAD,PUT,PATCH,POST,DELETE`)
- `CORS_ALLOWED_HEADERS` - Allowed headers (default: `Content-Type,Authorization`)

**Logging:**
- `LOG_LEVEL` - Log level: `fatal`, `error`, `warn`, `info`, `debug`, `trace` (default: `info`)
- `LOG_FORMAT` - Format: `json` or `pretty` (default: `json`)

**Circuit Breaker:**
- `CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE` - Error threshold 0-100 (default: `50`)
- `CIRCUIT_BREAKER_TIMEOUT` - Timeout in ms (default: `10000`)
- `CIRCUIT_BREAKER_RESET_TIMEOUT` - Reset timeout in ms (default: `30000`)
- `CIRCUIT_BREAKER_ROLLING_WINDOW` - Rolling window in ms (default: `10000`)

### Configuration Files

#### `src/config/env.validation.ts`
- Zod schema for environment variable validation
- Type inference: `EnvConfig` type
- Validates at application startup
- Provides clear error messages for missing/invalid variables

#### `src/config/logger.config.ts`
- Pino logger configuration
- JSON format for production, pretty for development
- Request/response logging
- Sensitive data redaction

## 🔄 Data Flow

### Address Validation Flow

1. **Request Received** (`AddressController`)
   - Input normalization (trim, collapse spaces)
   - DTO validation (class-validator)

2. **Cache Check** (`AddressService`)
   - Check cache with key: `address:{normalizedAddress}`
   - Return cached result if found

3. **Geocoding** (`GeocodingService`)
   - Circuit breaker protection
   - Call US Census Geocoding API
   - Parse response into structured format

4. **US Address Check** (`GeocodingService`)
   - Verify address is in US (state + ZIP validation)

5. **Validation Analysis** (`AddressService`)
   - Calculate similarity (Levenshtein distance)
   - Determine status (valid/corrected/unverifiable)
   - Calculate confidence score
   - Collect corrections

6. **Response** (`AddressService`)
   - Build response DTO
   - Cache result
   - Return to controller

7. **HTTP Response** (`AddressController`)
   - Return JSON response
   - Status code: 200 (OK)

### Error Handling Flow

1. **Invalid Input** → 400 Bad Request (class-validator)
2. **Geocoding API Error** → Handled by circuit breaker
3. **Circuit Breaker Open** → 503 Service Unavailable
4. **Network Error** → 500 Internal Server Error
5. **Invalid Address** → Status: `unverifiable`, Confidence: 0

## 🧪 Testing

### Test Structure
- **Unit Tests**: `src/__tests__/unit/`
- **E2E Tests**: `src/__tests__/e2e/`
- **Fixtures**: `src/__tests__/fixtures/`
- **Mocks**: `src/__tests__/mocks/`
- **Utils**: `src/__tests__/utils/`

### Running Tests
```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests only
npm run test:watch    # Watch mode
npm run test:cov      # With coverage
```

### Test Coverage
- Address validation logic
- Caching behavior
- Error handling
- Input validation
- API versioning
- Health checks
- Geocoding service integration
- US address validation

## 🚀 Development Workflow

### Starting the Application

**Development Mode (with hot reload):**
```bash
npm run start:dev
```

**Production Mode:**
```bash
npm run build
npm run start:prod
```

**Docker Development:**
```bash
docker-compose -f docker-compose.dev.yml up
```

**Docker Production:**
```bash
docker-compose up -d
```

### Common Tasks

#### Adding a New Endpoint
1. Create controller method in appropriate controller
2. Add route decorator (`@Get()`, `@Post()`, etc.)
3. Add Swagger decorators (`@ApiOperation()`, `@ApiResponse()`)
4. Create DTOs if needed
5. Add service method if business logic needed
6. Add tests

#### Adding Environment Variable
1. Add to `src/config/env.validation.ts` Zod schema
2. Add to `.env.example`
3. Use via `ConfigService` with type: `ConfigService<EnvConfig>`

#### Modifying Validation Logic
- Edit `src/address/address.service.ts`
- Methods to modify:
  - `analyzeValidation()` - Status determination
  - `calculateSimilarity()` - Similarity calculation
  - `determineStatus()` - Status logic
  - `adjustConfidenceBySimilarity()` - Confidence calculation

#### Adding New Geocoding Provider
1. Create new service implementing same interface
2. Update `GeocodingService` or create provider factory
3. Update `app.module.ts` to use new provider
4. Update tests

## 🔍 Key Files & Their Purposes

### `src/main.ts`
- Application bootstrap
- Middleware configuration (Helmet, CORS)
- Global validation pipe
- Swagger setup
- Server startup

### `src/app.module.ts`
- Root module configuration
- Global modules (Config, Logger, Throttler, Cache, Http)
- Controller and service registration
- Guards (ThrottlerGuard)

### `src/address/address.controller.ts`
- REST API endpoints
- Request/response handling
- Input normalization
- Swagger documentation

### `src/address/address.service.ts`
- Business logic for address validation
- Caching implementation
- Status determination
- Confidence scoring
- Similarity calculation (Levenshtein distance)

### `src/geocoding/geocoding.service.ts`
- US Census Geocoding API integration
- Circuit breaker implementation
- Error handling
- Response parsing
- US address validation

### `src/config/env.validation.ts`
- Environment variable validation schema
- Type definitions
- Default values

## 🛠️ Common Development Patterns

### Using ConfigService
```typescript
constructor(
  private readonly configService: ConfigService<EnvConfig>
) {
  const apiUrl = this.configService.get('GEOCODING_API_URL')!;
  const apiKey = this.configService.get('GEOCODING_API_KEY'); // Optional
  // Type-safe access with EnvConfig type
}
```

### Caching
```typescript
// Get from cache
const cached = await this.cacheManager.get<Type>(key);
if (cached) return cached;

// Set cache
await this.cacheManager.set(key, value, ttl);
```

### Error Handling
```typescript
// HttpException for expected errors (400, 404, etc.)
throw new HttpException('Message', HttpStatus.BAD_REQUEST);

// Let circuit breaker handle network errors
// Re-throw HttpExceptions, let others bubble up
```

### Logging
```typescript
this.logger.log('Message', 'Context');
this.logger.error('Error message', error.stack);
this.logger.debug('Debug info');
```

## 📝 Code Style & Conventions

### TypeScript
- Strict mode enabled
- Use interfaces for types
- Use DTOs for request/response
- Prefer `async/await` over Promises
- Use type inference where possible

### NestJS Patterns
- Use dependency injection
- Follow module structure
- Use decorators for metadata
- Implement proper error handling
- Use guards for cross-cutting concerns

### Naming Conventions
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- DTOs: `*.dto.ts`
- Interfaces: `*.interface.ts`
- Tests: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e)

## 🔐 Security Features

1. **Helmet** - Security headers (CSP, HSTS, XSS protection)
2. **CORS** - Configurable cross-origin resource sharing
3. **Rate Limiting** - Prevents abuse
4. **Input Validation** - DTO validation with class-validator
5. **Environment Validation** - Ensures required config is present
6. **Circuit Breaker** - Protects against external API failures

## 🐳 Docker Support

### Development
- Hot reload enabled
- Volume mounts for source code
- Development dependencies included

### Production
- Optimized build
- Multi-stage build
- Minimal image size
- Health checks

### Docker Compose
- Production: `docker-compose.yml`
- Development: `docker-compose.dev.yml`
- Optional Redis service

## 📊 Monitoring & Logging

### Logging
- Structured JSON logs (Pino)
- Request/response logging
- Error tracking with stack traces
- Configurable log levels

### Health Checks
- `/health` endpoint
- Returns service status
- Timestamp included

## 🎯 Future Enhancements

Potential improvements (not yet implemented):
1. Authentication/Authorization (API keys, JWT)
2. Multiple geocoding providers (fallback)
3. Batch address validation
4. Prometheus metrics
5. Database persistence
6. Webhook support
7. GraphQL endpoint

## 🚨 Important Notes for AI Agents

1. **Always validate environment variables** - Use `ConfigService<EnvConfig>` for type safety
2. **Circuit breaker errors** - HttpExceptions are NOT circuit breaker failures
3. **Caching** - Check cache before external API calls
4. **US addresses only** - Validate using `isUSAddress()` method
5. **Similarity calculation** - Uses Levenshtein distance algorithm
6. **Status determination** - Based on similarity thresholds, not just corrections
7. **Error handling** - Distinguish between expected errors (HttpException) and unexpected errors
8. **Type safety** - Always use TypeScript types, avoid `any`
9. **Testing** - Maintain test coverage when making changes
10. **Documentation** - Update Swagger decorators when changing endpoints

## 📚 Additional Resources

- **NestJS Documentation**: https://docs.nestjs.com
- **US Census Geocoding API**: https://geocoding.geo.census.gov/geocoder/geocoding_services.html
- **Zod Documentation**: https://zod.dev
- **Pino Documentation**: https://getpino.io

---

**Last Updated:** 2024-12-05  
**Maintained By:** AI Agent Documentation System

