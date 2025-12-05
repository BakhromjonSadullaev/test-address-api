/**
 * Cache manager mock for testing
 */

export const createCacheManagerMock = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  wrap: jest.fn(),
});

