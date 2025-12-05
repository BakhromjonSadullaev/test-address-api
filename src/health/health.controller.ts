import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the health status of the API service',
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
      },
    },
  })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'address-validation-api',
    };
  }
}

