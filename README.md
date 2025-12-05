# Address Validation API

A robust backend API built with NestJS and TypeScript that validates and standardizes US property addresses. The service integrates with Google Geocoding API to provide accurate address validation, correction, and standardization.

## Features

- **Address Validation**: Validates and standardizes free-form address text
- **US Address Support**: Restricts validation to US addresses only
- **Edge Case Handling**: Gracefully handles partial addresses, typos, and unverifiable addresses
- **Status Indication**: Returns clear status (valid, corrected, or unverifiable)
- **Rate Limiting**: Built-in rate limiting to prevent abuse (100 requests per minute by default)
- **Caching**: In-memory caching to reduce external API calls and improve performance
- **Error Handling**: Comprehensive error handling with meaningful error messages
- **Type Safety**: Full TypeScript support with DTOs and types
- **Environment Validation**: Zod-based validation ensures all required environment variables are present and valid at startup
- **Security Headers**: Helmet middleware protects against common header-based attacks
- **Docker Support**: Complete Docker and Docker Compose setup for easy deployment and development
- **Structured JSON Logging**: Pino-based logging with JSON output for log aggregation services (Datadog, ELK, etc.)
- **OpenAPI/Swagger Documentation**: Interactive API documentation with Swagger UI
- **API Versioning**: URL-based versioning (v1) for backward compatibility and future API evolution
- **Circuit Breaker**: Protects against cascading failures when external API is down using opossum

## Architecture & Design

### System Architecture

The application follows a modular architecture with clear separation of concerns:

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module with global configuration
├── address/                   # Address validation module
│   ├── address.controller.ts  # REST API endpoint
│   ├── address.service.ts     # Business logic for address validation
│   └── dto/                   # Data Transfer Objects
│       ├── validate-address.dto.ts
│       └── address-response.dto.ts
└── geocoding/                 # Geocoding service module
    ├── geocoding.service.ts   # Google Geocoding API integration
    └── types/                 # TypeScript types
        └── geocoding-result.interface.ts
```

### Key Design Decisions

1. **Service Layer Separation**: The `GeocodingService` is separated from `AddressService` to allow for easy swapping of geocoding providers or adding multiple providers in the future.

2. **Caching Strategy**: 
   - In-memory caching is used by default (can be upgraded to Redis)
   - Cache key is based on normalized address input
   - Negative results (unverifiable addresses) are cached for shorter duration (5 minutes) to allow for retries
   - Positive results are cached for 1 hour by default

3. **Rate Limiting**:
   - Implemented using `@nestjs/throttler`
   - Global rate limit: 100 requests per 60 seconds (configurable)
   - Applied at the controller level with additional endpoint-specific limits

4. **Validation Status Logic**:
   - **VALID**: Address matches exactly or with minimal changes (similarity > 0.9)
   - **CORRECTED**: Address was modified but verified (similarity 0.5-0.9)
   - **UNVERIFIABLE**: Address could not be found or is not a US address

5. **Confidence Scoring**: Uses string similarity (Levenshtein distance) to calculate confidence scores, with adjustments based on specific corrections made.

### Rate Limiting Implementation

Rate limiting is implemented at multiple levels:

1. **Global Rate Limiting**: Configured in `app.module.ts` using `ThrottlerModule`
2. **Endpoint-Specific Limits**: Applied via `@Throttle()` decorator on the controller method
3. **Configurable**: Limits can be adjusted via environment variables

```typescript
// Global configuration
ThrottlerModule.forRoot([{
  ttl: 60000,  // Time window in milliseconds
  limit: 100   // Max requests per window
}])

// Endpoint-specific
@Throttle({ default: { limit: 100, ttl: 60000 } })
```

### Caching Implementation

Caching is implemented using NestJS's `@nestjs/cache-manager` with automatic Redis support:

1. **Automatic Selection**: 
   - If `REDIS_HOST` is set, Redis is used for distributed caching
   - If `REDIS_HOST` is empty, in-memory cache is used (default)
   - Automatic fallback to in-memory if Redis connection fails

2. **Redis Configuration**:
   - Configure via environment variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`
   - Supports TLS connections for secure Redis instances
   - Connection status is logged on startup

3. **In-Memory Cache**: 
   - Used when Redis is not configured or unavailable
   - Suitable for single-instance deployments
   - Limited to 100 items by default

4. **Cache Key Strategy**: Uses normalized address as key (`address:{normalizedAddress}`)

5. **TTL Configuration**: 
   - Valid/corrected addresses: 1 hour (configurable via `REDIS_TTL`)
   - Unverifiable addresses: 5 minutes (hardcoded to allow retries)

**Example Redis Configuration:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_TLS=false
REDIS_TTL=3600
```

**Benefits of Redis:**
- Shared cache across multiple application instances
- Persistent cache across server restarts
- Better performance for high-traffic applications
- Support for distributed systems

### CORS Configuration

CORS is fully configurable via environment variables:

1. **Origin Control**: Configure allowed origins via `CORS_ORIGIN`
   - Use `*` to allow all origins (default, for development)
   - Use comma-separated list for production: `https://example.com,https://app.example.com`
2. **Credentials**: Control credential sharing with `CORS_CREDENTIALS` (default: `false`)
3. **Methods**: Configure allowed HTTP methods via `CORS_METHODS` (default: all common methods)
4. **Headers**: Configure allowed headers via `CORS_ALLOWED_HEADERS` (default: `Content-Type,Authorization`)

**Security Note**: In production, always set specific origins instead of `*` to prevent unauthorized access.

```typescript
// Example production configuration
CORS_ORIGIN=https://myapp.com,https://www.myapp.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST
CORS_ALLOWED_HEADERS=Content-Type,Authorization
```

### Circuit Breaker

The application implements a circuit breaker pattern using `opossum` to protect against cascading failures when the Google Geocoding API is down or experiencing issues.

**How it works:**
1. **Closed State**: Normal operation - all requests go through
2. **Open State**: Circuit opens when error threshold is exceeded - requests are immediately rejected
3. **Half-Open State**: After reset timeout, circuit allows test requests to check if service recovered
4. **Close State**: If test requests succeed, circuit closes and normal operation resumes

**Configuration:**
- `CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE`: Percentage of failures before opening circuit (default: 50%)
- `CIRCUIT_BREAKER_TIMEOUT`: Timeout in milliseconds for API calls (default: 10000ms)
- `CIRCUIT_BREAKER_RESET_TIMEOUT`: Time to wait before attempting to close circuit (default: 30000ms)
- `CIRCUIT_BREAKER_ROLLING_WINDOW`: Time window in milliseconds for error rate calculation (default: 10000ms)

**Error Filtering:**
- HttpExceptions (like `BAD_REQUEST` for invalid addresses) are **not** counted as circuit breaker failures
- Only network errors, timeouts, and service unavailability errors trigger the circuit breaker
- This ensures that invalid address requests don't cause the circuit to open

**Benefits:**
- Prevents cascading failures when external API is down
- Fast failure response instead of waiting for timeouts
- Automatic recovery when service comes back online
- Reduces load on failing external services

### Structured JSON Logging

The application uses Pino for structured JSON logging, compatible with log aggregation services like Datadog, ELK Stack, CloudWatch, etc.

**Features:**
1. **Structured JSON Output**: All logs are in JSON format for easy parsing and indexing
2. **Request/Response Logging**: Automatic HTTP request/response logging with metadata
3. **Error Tracking**: Detailed error logging with stack traces
4. **Sensitive Data Redaction**: Automatically redacts passwords, tokens, and API keys
5. **Request ID Tracking**: Supports `x-request-id` header for distributed tracing
6. **Configurable Format**: JSON for production, pretty-printed for development
7. **Log Levels**: Configurable log levels (fatal, error, warn, info, debug, trace)

**Log Format Examples:**

**JSON Format (Production):**
```json
{
  "level": "INFO",
  "time": 1701234567890,
  "pid": 12345,
  "hostname": "server-01",
  "service": "address-validation-api",
  "environment": "production",
  "request": {
    "id": "req-123",
    "method": "POST",
    "url": "/validate-address",
    "remoteAddress": "192.168.1.100"
  },
  "response": {
    "statusCode": 200
  },
  "duration": 145,
  "msg": "POST /validate-address 200"
}
```

**Configuration:**
```env
LOG_LEVEL=info          # fatal, error, warn, info, debug, trace
LOG_FORMAT=json         # json for production, pretty for development
```

**Integration with Log Services:**
- **Datadog**: Automatically parses JSON logs when configured
- **ELK Stack**: Use Filebeat or Logstash to forward logs
- **CloudWatch**: Native JSON log support
- **Splunk**: JSON logs are automatically indexed

### Security Headers (Helmet)

The application uses Helmet middleware to set various HTTP security headers:

1. **Content Security Policy (CSP)**: Restricts which resources can be loaded
2. **HTTP Strict Transport Security (HSTS)**: Forces HTTPS connections (1 year max-age)
3. **X-Content-Type-Options**: Prevents MIME type sniffing (`noSniff`)
4. **X-Frame-Options**: Prevents clickjacking attacks (`DENY`)
5. **X-XSS-Protection**: Enables browser XSS filter

Helmet is configured with API-friendly settings:
- Relaxed CSP for API endpoints
- HSTS enabled with subdomain support
- Cross-Origin Embedder Policy disabled (not needed for REST APIs)

These headers protect against common web vulnerabilities like:
- Cross-Site Scripting (XSS)
- Clickjacking
- MIME type sniffing
- Protocol downgrade attacks

### Environment Variable Validation

Environment variables are validated at application startup using Zod:

1. **Startup Validation**: All required environment variables are validated before the app starts
2. **Type Safety**: TypeScript types are inferred from the Zod schema (`ConfigService<EnvConfig>`)
3. **Clear Error Messages**: If validation fails, the app shows detailed error messages and exits
4. **Default Values**: Optional variables have sensible defaults
5. **Type Coercion**: String values are automatically converted to numbers where needed

The validation schema is defined in `src/config/env.validation.ts`:

```typescript
export const envValidationSchema = z.object({
  GOOGLE_GEOCODING_API_KEY: z.string().min(1, 'Required'),
  PORT: z.string().default('3000').transform(parseInt),
  // ... other variables
});
```

If any required variable is missing or invalid, the application will fail to start with a clear error message:

```
❌ Invalid environment variables:
  - GOOGLE_GEOCODING_API_KEY: Required
```

### Error Handling

The API handles various error scenarios:

- **Invalid Input**: Validated using class-validator DTOs
- **API Errors**: Google Geocoding API errors are caught and converted to appropriate HTTP status codes
- **Network Errors**: Gracefully handled with fallback to unverifiable status
- **Missing Configuration**: Environment validation ensures required config is present at startup

## Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **HTTP Client**: Axios (via @nestjs/axios)
- **Validation**: class-validator, class-transformer
- **Caching**: @nestjs/cache-manager (in-memory, Redis-ready)
- **Rate Limiting**: @nestjs/throttler
- **External API**: Google Geocoding API

## Prerequisites

### Option 1: Docker (Recommended - Easiest Setup)
- Docker (v20.10 or higher) - [Download here](https://www.docker.com/get-started)
- Docker Compose (v2.0 or higher - included with Docker Desktop)
- Google Geocoding API key ([Get one here](https://developers.google.com/maps/documentation/geocoding/get-api-key))

### Option 2: Local Development
- Node.js (v18 or higher)
- npm or yarn
- Redis (optional, for distributed caching)
- Google Geocoding API key ([Get one here](https://developers.google.com/maps/documentation/geocoding/get-api-key))

## Installation

### Quick Start with Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd test-project
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your Google Geocoding API key:
```env
GOOGLE_GEOCODING_API_KEY=your_google_api_key_here
```

4. Start everything with Docker Compose:
```bash
docker-compose up -d
```

That's it! The application and Redis will start automatically. The API will be available at `http://localhost:3000`.

**Docker Commands:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# Rebuild containers
docker-compose build

# Clean up (removes volumes)
docker-compose down -v
```

### Local Installation (Without Docker)

1. Clone the repository:
```bash
git clone <repository-url>
cd test-project
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development
GOOGLE_GEOCODING_API_KEY=your_google_api_key_here
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
REDIS_TTL=3600
```

5. (Optional) Start Redis locally:
```bash
# macOS
brew install redis && brew services start redis

# Linux
sudo apt-get install redis-server && sudo systemctl start redis

# Docker (if you have Docker but want Redis only)
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

## Running the Application

### With Docker (Recommended)

**Production Mode:**
```bash
docker-compose up -d
```

**Development Mode (with hot reload):**
```bash
docker-compose -f docker-compose.dev.yml up
```

**View Logs:**
```bash
docker-compose logs -f api
```

The API will be available at `http://localhost:3000`

### Local Development (Without Docker)

**Development Mode:**
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

**Production Mode:**
```bash
npm run build
npm run start:prod
```

## API Documentation

### API Versioning

The API uses URL-based versioning for backward compatibility:
- **Current Version**: v1
- **Versioned Endpoints**: All endpoints are prefixed with `/v1/`
- **Default Version**: v1 (you can omit `/v1/` and it will default to v1)

**Example:**
- Versioned: `POST /v1/validate-address`
- Default (also works): `POST /validate-address` → automatically uses v1

**Benefits:**
- Backward compatibility when introducing breaking changes
- Multiple API versions can coexist
- Clear versioning strategy for API evolution

### Swagger UI

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3000/api`
- **OpenAPI JSON**: `http://localhost:3000/api-json`
- **OpenAPI YAML**: `http://localhost:3000/api-yaml`

The Swagger UI provides:
- Interactive API testing
- Request/response examples
- Schema documentation
- Try-it-out functionality
- Optional authentication support (currently not required)

**Note**: The API currently does not require authentication. The "Authorize" button in Swagger is optional and can be left empty.

### API Endpoints

### POST /v1/validate-address

**Alias**: `POST /validate-address` (defaults to v1)

Validates and standardizes a property address.

**Request Body:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Response (Valid Address):**
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

**Response (Corrected Address):**
```json
{
  "status": "corrected",
  "originalAddress": "1600 Amphitheatre Pkwy, Mt View, California",
  "standardizedAddress": {
    "streetNumber": "1600",
    "street": "Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "zipCode": "94043",
    "fullAddress": "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
  },
  "confidence": 0.75,
  "corrections": [
    "Standardized state to: CA",
    "Added/formatted zip code: 94043"
  ],
  "message": "Address was corrected: Standardized state to: CA, Added/formatted zip code: 94043"
}
```

**Response (Unverifiable Address):**
```json
{
  "status": "unverifiable",
  "originalAddress": "123 Fake Street, Nowhere, XY",
  "standardizedAddress": {},
  "confidence": 0,
  "message": "Address could not be found or verified"
}
```

## Testing the API

### Using cURL

```bash
curl -X POST http://localhost:3000/validate-address \
  -H "Content-Type: application/json" \
  -d '{"address": "1600 Amphitheatre Parkway, Mountain View, CA"}'
```

### Using Postman

1. Create a new POST request
2. URL: `http://localhost:3000/validate-address`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

## Development Tools Used

### AI Assistance

This project was developed with assistance from AI coding assistants (Claude via Cursor). The AI was used for:

1. **Initial Project Setup**: Generating NestJS project structure and configuration files
2. **Code Generation**: Creating service classes, controllers, and DTOs following NestJS best practices
3. **Architecture Design**: Designing the modular structure and separation of concerns
4. **Error Handling**: Implementing comprehensive error handling patterns
5. **Documentation**: Assisting with README creation and code comments

The AI was particularly helpful in:
- Ensuring proper TypeScript typing throughout the codebase
- Implementing caching and rate limiting patterns
- Creating a clean, maintainable code structure
- Following NestJS conventions and best practices

### Manual Implementation

The following aspects were carefully designed and implemented:

1. **Business Logic**: Address validation status determination and confidence scoring
2. **Similarity Algorithm**: Levenshtein distance calculation for address comparison
3. **Caching Strategy**: Deciding on cache keys, TTLs, and negative result handling
4. **API Response Structure**: Designing the response DTO to be clear and informative


## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `GOOGLE_GEOCODING_API_KEY` | Google Geocoding API key | **Required** |
| `RATE_LIMIT_TTL` | Rate limit time window in seconds | `60` |
| `RATE_LIMIT_MAX` | Maximum requests per time window | `100` |
| `REDIS_TTL` | Cache TTL in seconds | `3600` |
| `REDIS_HOST` | Redis host (empty = in-memory cache) | `` (empty) |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password (if required) | `` (optional) |
| `REDIS_TLS` | Enable TLS for Redis | `false` |
| `CORS_ORIGIN` | Allowed origins (comma-separated or `*` for all) | `*` |
| `CORS_CREDENTIALS` | Allow credentials in CORS requests | `false` |
| `CORS_METHODS` | Allowed HTTP methods (comma-separated) | `GET,HEAD,PUT,PATCH,POST,DELETE` |
| `CORS_ALLOWED_HEADERS` | Allowed headers (comma-separated) | `Content-Type,Authorization` |
| `LOG_LEVEL` | Log level (fatal, error, warn, info, debug, trace) | `info` |
| `LOG_FORMAT` | Log format (json for production, pretty for dev) | `json` |
| `CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE` | Error threshold to open circuit (0-100) | `50` |
| `CIRCUIT_BREAKER_TIMEOUT` | API call timeout in milliseconds | `10000` |
| `CIRCUIT_BREAKER_RESET_TIMEOUT` | Time before attempting to close circuit (ms) | `30000` |
| `CIRCUIT_BREAKER_ROLLING_WINDOW` | Time window for error rate calculation (ms) | `10000` |

## Project Structure

```
test-project/
├── src/
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   ├── config/                          # Configuration
│   │   └── env.validation.ts           # Environment variable validation schema
│   ├── address/                         # Address validation module
│   │   ├── address.controller.ts       # REST controller
│   │   ├── address.service.ts           # Business logic
│   │   └── dto/                         # Data Transfer Objects
│   │       ├── validate-address.dto.ts
│   │       └── address-response.dto.ts
│   └── geocoding/                       # Geocoding service module
│       ├── geocoding.service.ts         # Google API integration
│       └── types/
│           └── geocoding-result.interface.ts
├── Dockerfile                           # Production Docker image
├── Dockerfile.dev                       # Development Docker image
├── docker-compose.yml                   # Production Docker Compose
├── docker-compose.dev.yml               # Development Docker Compose
├── .dockerignore                        # Docker ignore file
├── .env.example                         # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

## Testing

The project includes comprehensive test coverage organized in a dedicated `src/__tests__/` folder following NestJS best practices.

### Running Tests

```bash
# Run all tests (unit + e2e)
npm test
# or
npm run test:all

# Run unit tests only
npm run test:unit

# Run e2e tests only
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### Test Structure

The test suite is organized in a dedicated `src/__tests__/` folder:

```
src/
├── __tests__/
│   ├── unit/              # Unit tests (mirror src/ structure)
│   │   ├── address/
│   │   │   ├── address.service.spec.ts
│   │   │   └── address.controller.spec.ts
│   │   ├── geocoding/
│   │   │   └── geocoding.service.spec.ts
│   │   └── health/
│   │       └── health.controller.spec.ts
│   ├── e2e/               # End-to-end tests
│   │   └── address-validation.e2e-spec.ts
│   ├── fixtures/          # Reusable test data
│   │   ├── address.fixtures.ts
│   │   └── geocoding.fixtures.ts
│   ├── mocks/             # Shared mocks
│   │   ├── cache.mock.ts
│   │   └── geocoding.mock.ts
│   └── utils/             # Test utilities
│       └── test-helpers.ts
├── address/               # Source code
├── geocoding/
└── ...
```

**Unit Tests** (`src/__tests__/unit/`):
- `address/address.service.spec.ts` - Address validation service tests
- `address/address.controller.spec.ts` - Controller tests
- `geocoding/geocoding.service.spec.ts` - Geocoding service tests
- `health/health.controller.spec.ts` - Health check tests

**E2E Tests** (`src/__tests__/e2e/`):
- `address-validation.e2e-spec.ts` - Full integration tests for API endpoints
  - Tests versioning, validation, error handling
  - Tests CORS and rate limiting headers
  - Tests health check and API info endpoints

**Test Fixtures** (`src/__tests__/fixtures/`):
- Reusable mock data for consistent testing across test files

**Test Mocks** (`src/__tests__/mocks/`):
- Shared mock implementations for services and dependencies

**Test Utilities** (`src/__tests__/utils/`):
- Helper functions and utilities, including `TestClient` for making API requests

For more details, see [src/__tests__/README.md](src/__tests__/README.md).

### Test Coverage

The test suite covers:
- ✅ Address validation logic
- ✅ Caching behavior
- ✅ Error handling
- ✅ Input validation
- ✅ API versioning
- ✅ Health checks
- ✅ Geocoding service integration
- ✅ US address validation

## Future Enhancements

1. **Redis Caching**: Upgrade to Redis for distributed caching
2. **Multiple Geocoding Providers**: Add fallback providers for redundancy
3. **Batch Validation**: Support for validating multiple addresses in one request
4. **Authentication**: Add API key authentication for production use
5. **Metrics & Monitoring**: Add Prometheus metrics and health checks
6. **Docker Support**: Containerization for easy deployment ✅ (Implemented)
7. **API Documentation**: Swagger/OpenAPI documentation ✅ (Implemented)
8. **Enhanced Test Coverage**: Add more edge case tests

## License

MIT

## Author

Developed as a test project demonstrating backend API design, external service integration, and best practices in NestJS development.

