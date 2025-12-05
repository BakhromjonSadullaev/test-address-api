import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from 'src/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', () => {
    const result = controller.healthCheck();

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('service');
    expect(result.status).toBe('ok');
    expect(result.service).toBe('address-validation-api');
    expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  });
});

