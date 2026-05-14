import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config';

/**
 * Request Logger Middleware
 *
 * Assigns a unique request ID to every request for tracing through logs.
 * Logs request start + completion with duration.
 *
 * Why request IDs?
 * - Correlate logs across services in distributed systems
 * - Debug specific user issues ("give me your request ID")
 * - Essential for production debugging at scale
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Attach unique ID (prefer client-provided for distributed tracing)
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  const startTime = process.hrtime.bigint();

  // Log request start
  logger.info({
    msg: 'Incoming request',
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response completion
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    const logData = {
      msg: 'Request completed',
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };

    if (res.statusCode >= 500) {
      logger.error(logData);
    } else if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }
  });

  next();
}
