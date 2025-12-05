import { Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.validation';

/**
 * Logger configuration for structured JSON logging
 * Compatible with log aggregation services like Datadog, ELK, etc.
 */
export const loggerConfig = (
  configService: ConfigService<EnvConfig>,
): Params => {
  const logLevel = configService.get('LOG_LEVEL')!;
  const logFormat = configService.get('LOG_FORMAT')!;
  const nodeEnv = configService.get('NODE_ENV')!;

  const isDevelopment = nodeEnv === 'development';
  // Use pretty format if explicitly set to 'pretty', or if in development and format is not explicitly 'json'
  const usePretty = logFormat === 'pretty' || (isDevelopment && logFormat !== 'json');

  return {
    pinoHttp: {
      level: logLevel,
      // Use pretty printing in development, JSON in production
      transport: usePretty
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      // Structured JSON logging for production
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          headers: {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type'],
          },
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
          headers: res.headers,
        }),
        err: (err) => ({
          type: err.type,
          message: err.message,
          stack: err.stack,
          code: err.code,
          statusCode: err.statusCode,
        }),
      },
      // Custom log formatter for structured logs
      formatters: {
        level: (label: string) => {
          return { level: label.toUpperCase() };
        },
        bindings: (bindings) => {
          return {
            pid: bindings.pid,
            hostname: bindings.hostname,
            service: 'address-validation-api',
            environment: nodeEnv,
          };
        },
      },
      // Request ID generation
      genReqId: (req) => {
        return req.headers['x-request-id'] || req.id;
      },
      // Custom error serializer
      customErrorObject: (req, res, err) => {
        return {
          type: err.constructor.name,
          message: err.message,
          stack: err.stack,
          statusCode: res.statusCode,
          path: req.url,
          method: req.method,
        };
      },
      // Redact sensitive information
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.body.password',
          'req.body.token',
        ],
        remove: true,
      },
      // Custom log message
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // Custom success message
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      // Custom error message
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      },
      // Custom attribute keys for better compatibility with log services
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'duration',
      },
    },
  };
};

