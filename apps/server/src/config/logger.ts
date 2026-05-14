import pino from 'pino';
import { config } from './env';

/**
 * Structured logger using Pino.
 *
 * Why Pino over Winston?
 * - 5x faster (critical at 100k+ users)
 * - JSON-native (perfect for CloudWatch/DataDog/ELK)
 * - Low overhead (doesn't block event loop)
 * - pino-pretty for dev readability
 */
export const logger = pino({
  level: config.logging.level,
  transport: config.server.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined, // JSON in production (machine-parseable)
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
