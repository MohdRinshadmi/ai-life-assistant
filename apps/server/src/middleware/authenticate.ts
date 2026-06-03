import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@shared/errors';
import { verifyAccessToken } from '@shared/utils/jwt';
import { logger } from '@config';

/**
 * Authentication Middleware
 *
 * Verifies JWT access token from Authorization header.
 * Attaches decoded user payload to req.user for downstream handlers.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Token not provided');
    }

    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication — doesn't fail if no token is present.
 * Useful for endpoints that behave differently for logged-in vs anonymous users.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
        };
      }
    }

    next();
  } catch (error) {
    // Silently continue without auth for optional routes
    logger.debug({ msg: 'Optional auth failed, continuing without user', error });
    next();
  }
}
