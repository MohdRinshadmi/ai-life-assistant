import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@shared/errors';
import { logger } from '@config';

/**
 * Global Error Handler
 *
 * This is the LAST middleware in the chain. Every error ends up here.
 *
 * Strategy:
 * 1. Operational errors (expected) → return error response to client
 * 2. Programmer errors (unexpected) → log, alert, return generic 500
 * 3. Zod validation errors → transform to 422 with field-level details
 *
 * Why this pattern?
 * - Single place to handle all errors consistently
 * - Prevents leaking internal details to clients
 * - Enables centralized alerting for critical errors
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ── Zod Validation Errors ──────────────────────────
  if (err instanceof ZodError) {
    const fieldErrors = err.flatten().fieldErrors;
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: fieldErrors,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // ── Known Application Errors ───────────────────────
  if (err instanceof AppError) {
    // Log operational errors at warn level, programmer errors at error
    if (err.isOperational) {
      logger.warn({
        msg: err.message,
        code: err.code,
        statusCode: err.statusCode,
        requestId: req.id,
      });
    } else {
      logger.error({
        msg: err.message,
        code: err.code,
        statusCode: err.statusCode,
        requestId: req.id,
        stack: err.stack,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      ...err.toJSON(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // ── Unknown Errors (Programmer bugs) ───────────────
  logger.error({
    msg: 'Unhandled error',
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    url: req.originalUrl,
    method: req.method,
  });

  // Never leak internal error details in production
  const message =
    process.env.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
    timestamp: new Date().toISOString(),
  });
};
