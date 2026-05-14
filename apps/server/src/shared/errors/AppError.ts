/**
 * Application Error Hierarchy
 *
 * Why custom errors?
 * - Consistent error shape across the entire API
 * - HTTP status codes tied to error types (not scattered in controllers)
 * - Operational vs Programmer errors distinction (critical for error handling strategy)
 * - Serializable to JSON for API responses
 *
 * Pattern: Throw domain errors in services → catch in error middleware → serialize to response
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// ── Specific Error Types ────────────────────────────────────────────

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT', true);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super('Validation failed', 422, 'VALIDATION_ERROR', true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, 'TOO_MANY_REQUESTS', true);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    // isOperational = false → this is a programmer error, triggers alerts
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE', true);
  }
}
