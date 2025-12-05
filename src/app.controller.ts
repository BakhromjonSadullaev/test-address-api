import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('general')
@Controller({
  path: '',
  version: VERSION_NEUTRAL,
})
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'API root endpoint',
    description: 'Returns API information and available endpoints',
  })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Address Validation API' },
        version: { type: 'string', example: '1.0.0' },
        status: { type: 'string', example: 'running' },
        endpoints: {
          type: 'object',
          properties: {
            health: { type: 'string', example: 'GET /health' },
            documentation: { type: 'string', example: 'GET /api' },
            validateAddress: { type: 'string', example: 'POST /v1/validate-address' },
            apiInfo: { type: 'string', example: 'GET /v1/validate-address/info' },
          },
        },
      },
    },
  })
  getRoot() {
    return {
      message: 'Address Validation API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: 'GET /health',
        documentation: 'GET /api',
        validateAddress: 'POST /v1/validate-address',
        apiInfo: 'GET /v1/validate-address/info',
      },
      description:
        'A robust API for validating and standardizing US property addresses using Google Geocoding API',
    };
  }
}

