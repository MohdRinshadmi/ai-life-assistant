/**
 * Express type augmentation
 *
 * Extends Express Request with custom properties used across the application.
 * This is a declaration merge — TypeScript will see these properties on every req object.
 */

declare global {
  namespace Express {
    interface Request {
      /** Unique request ID for distributed tracing */
      id?: string;

      /** Authenticated user payload (set by auth middleware) */
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export {};
