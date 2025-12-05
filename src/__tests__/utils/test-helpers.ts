/**
 * Test utility functions
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * Helper to make API requests in tests
 */
export class TestClient {
  constructor(private app: INestApplication) {}

  validateAddress(address: string) {
    return request(this.app.getHttpServer())
      .post('/v1/validate-address')
      .send({ address });
  }

  getHealth() {
    return request(this.app.getHttpServer()).get('/health');
  }

  getApiInfo() {
    return request(this.app.getHttpServer()).get('/v1/validate-address/info');
  }
}

/**
 * Create a test client instance
 */
export function createTestClient(app: INestApplication): TestClient {
  return new TestClient(app);
}

