# Tests

This directory contains all test files organized following NestJS best practices.

## Structure

```
src/
└── __tests__/
    ├── unit/              # Unit tests (mirror src/ structure)
    │   ├── address/
    │   ├── geocoding/
    │   └── health/
    ├── e2e/               # End-to-end tests
    │   └── address-validation.e2e-spec.ts
    ├── fixtures/          # Reusable test data
    │   ├── address.fixtures.ts
    │   └── geocoding.fixtures.ts
    ├── mocks/             # Shared mocks
    │   ├── cache.mock.ts
    │   └── geocoding.mock.ts
    └── utils/             # Test utilities
        └── test-helpers.ts
```

## Running Tests

### Run all tests
```bash
npm test
# or
npm run test:all
```

### Run unit tests only
```bash
npm run test:unit
```

### Run e2e tests only
```bash
npm run test:e2e
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:cov
```

## Test Organization

### Unit Tests (`src/__tests__/unit/`)
Unit tests are organized to mirror the `src/` directory structure. Each module has its own test file:
- `address/address.service.spec.ts` - Tests for AddressService
- `address/address.controller.spec.ts` - Tests for AddressController
- `geocoding/geocoding.service.spec.ts` - Tests for GeocodingService
- `health/health.controller.spec.ts` - Tests for HealthController

### E2E Tests (`src/__tests__/e2e/`)
End-to-end tests verify the entire application flow:
- `address-validation.e2e-spec.ts` - Full API integration tests

### Fixtures (`src/__tests__/fixtures/`)
Reusable test data to ensure consistency across tests:
- `address.fixtures.ts` - Address-related test data
- `geocoding.fixtures.ts` - Geocoding API response mocks

### Mocks (`src/__tests__/mocks/`)
Shared mock implementations for services and dependencies:
- `cache.mock.ts` - Cache manager mock
- `geocoding.mock.ts` - Geocoding service mock

### Utilities (`src/__tests__/utils/`)
Helper functions and utilities for writing tests:
- `test-helpers.ts` - TestClient class for making API requests

## Best Practices

1. **Use fixtures** for consistent test data
2. **Use mocks** for external dependencies
3. **Keep tests isolated** - each test should be independent
4. **Use descriptive test names** - follow the pattern: `should [expected behavior] when [condition]`
5. **Test edge cases** - invalid inputs, error conditions, boundary values
6. **Maintain test coverage** - aim for >80% coverage

## Writing New Tests

### Unit Test Example
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from 'src/your-module/your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Test Example
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { createTestClient } from '../utils/test-helpers';

describe('Your Feature (e2e)', () => {
  let app: INestApplication;
  let testClient: ReturnType<typeof createTestClient>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    testClient = createTestClient(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should test your feature', () => {
    return testClient
      .validateAddress('test address')
      .expect(200);
  });
});
```

