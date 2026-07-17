import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '@config';
import { UnauthorizedError } from '@shared/errors';

/**
 * JWT Token Utilities
 *
 * Token Strategy:
 * - Access Token: Short-lived (15m), stateless, used for API auth
 * - Refresh Token: Long-lived (7d), stored in DB (enables revocation)
 *
 * Why two tokens?
 * - Access tokens are validated without DB lookup (fast, scalable)
 * - Refresh tokens enable: logout-from-all-devices, token revocation, session management
 * - If access token is stolen, damage is limited to 15 minutes
 *
 * Security measures:
 * - Different secrets for access vs refresh (compromise one doesn't compromise other)
 * - Refresh tokens stored as bcrypt hashes in DB (never raw)
 * - Token family tracking for rotation attack detection
 */

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'],
    issuer: 'ai-life-assistant',
    audience: 'ai-life-mobile',
  };

  return jwt.sign(payload, config.jwt.accessSecret, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
    issuer: 'ai-life-assistant',
    audience: 'ai-life-mobile',
  };

  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

export function verifyAccessToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      issuer: 'ai-life-assistant',
      audience: 'ai-life-mobile',
    }) as DecodedToken;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

export function verifyRefreshToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'ai-life-assistant',
      audience: 'ai-life-mobile',
    }) as DecodedToken;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * Calculate expiration date from JWT duration string (e.g., "7d" → Date)
 */
export function getExpirationDate(duration: string): Date {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const now = new Date();
  switch (unit) {
    case 's': return new Date(now.getTime() + value * 1000);
    case 'm': return new Date(now.getTime() + value * 60 * 1000);
    case 'h': return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd': return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default: throw new Error(`Unknown time unit: ${unit}`);
  }
}
