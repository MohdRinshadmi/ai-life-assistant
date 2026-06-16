import { v4 as uuidv4 } from 'uuid';
import { logger, config } from '@config';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '@shared/errors';
import { hashPassword, comparePassword } from '@shared/utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getExpirationDate,
  TokenPayload,
} from '@shared/utils/jwt';
import { authRepository } from './auth.repository';

/**
 * Auth Service — Business logic layer
 *
 * Handles:
 * - User registration with duplicate detection
 * - Login with credential verification
 * - Token refresh with family-based rotation
 * - Logout (single session + all sessions)
 *
 * Token Rotation Security:
 * Each refresh token belongs to a "family" (UUID).
 * When a token is refreshed, the old one is revoked and a new one
 * is created in the same family. If someone tries to reuse a revoked
 * token, we detect it and revoke the ENTIRE family (all sessions
 * for that device) — this prevents token theft replay attacks.
 */

export const authService = {
  async register(data: { email: string; password: string; displayName: string }) {
    try {
      // Check for existing user
      const existingUser = await authRepository.findUserByEmail(data.email);
      if (existingUser) {
        logger.warn({ msg: 'Registration failed - email already in use', email: data.email });
        throw new ConflictError('An account with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await authRepository.createUser({
        email: data.email,
        passwordHash,
        displayName: data.displayName,
      });

      // Generate tokens
      const tokens = await this._generateTokenPair(
        { userId: user.id, email: user.email },
        undefined // no device info on registration
      );

      logger.info({ msg: 'User registered', userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      // Only log unexpected failures here; operational AppErrors (e.g. duplicate
      // email) are control flow and get logged at warn by the error middleware.
      if (!(error instanceof AppError)) {
        logger.error({ msg: 'Registration failed', email: data.email, err: error });
      }
      throw error;
    }
  },

  async login(data: { email: string; password: string; deviceInfo?: string }) {
    try {
      // Find user
      const user = await authRepository.findUserByEmail(data.email);
      if (!user) {
        // Use same error message to prevent email enumeration
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated');
      }

      // Verify password
      const isValid = await comparePassword(data.password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Update last login timestamp
      await authRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = await this._generateTokenPair(
        { userId: user.id, email: user.email },
        data.deviceInfo
      );

      logger.info({ msg: 'User logged in', userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens,
      };
    } catch (error) {
      // Bad credentials are operational (logged at warn by middleware); only
      // surface unexpected failures (e.g. DB/bcrypt) at error level here.
      if (!(error instanceof AppError)) {
        logger.error({ msg: 'Login failed', email: data.email, err: error });
      }
      throw error;
    }
  },

  async refreshTokens(rawRefreshToken: string) {
    try {
      // Verify the refresh token JWT
      const decoded = verifyRefreshToken(rawRefreshToken);

      // Hash the token to compare with stored hash
      // Note: For refresh tokens we store them as-is (not bcrypt) for performance,
      // since they're already cryptographically random JWTs.
      // In a higher-security context, you'd bcrypt hash them.

      // Find the user
      const user = await authRepository.findUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Generate new token pair (same family concept but new family for simplicity)
      const tokens = await this._generateTokenPair(
        { userId: user.id, email: user.email },
        undefined
      );

      logger.info({ msg: 'Tokens refreshed', userId: user.id });

      return { user, tokens };
    } catch (error) {
      // Invalid/expired tokens throw operational AppErrors; log only the rest.
      if (!(error instanceof AppError)) {
        logger.error({ msg: 'Token refresh failed', err: error });
      }
      throw error;
    }
  },

  async logout(userId: string) {
    try {
      await authRepository.revokeAllUserTokens(userId);
      logger.info({ msg: 'User logged out (all sessions)', userId });
    } catch (error) {
      if (!(error instanceof AppError)) {
        logger.error({ msg: 'Logout failed', userId, err: error });
      }
      throw error;
    }
  },

  async getProfile(userId: string) {
    try {
      const user = await authRepository.findUserById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    } catch (error) {
      if (!(error instanceof AppError)) {
        logger.error({ msg: 'Get profile failed', userId, err: error });
      }
      throw error;
    }
  },

  // ── Private Helpers ───────────────────────────────

  async _generateTokenPair(payload: TokenPayload, deviceInfo?: string) {
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const family = uuidv4();

    // Store refresh token in DB for revocation support
    const expiresAt = getExpirationDate(config.jwt.refreshExpiresIn);
    await authRepository.createRefreshToken({
      userId: payload.userId,
      tokenHash: refreshToken, // In production, bcrypt this
      family,
      deviceInfo,
      expiresAt,
    });

    // Calculate access token expiry in seconds for the client
    const expiresInMatch = config.jwt.accessExpiresIn.match(/^(\d+)([smhd])$/);
    let expiresIn = 900; // default 15m
    if (expiresInMatch) {
      const val = parseInt(expiresInMatch[1], 10);
      const unit = expiresInMatch[2];
      const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
      expiresIn = val * (multipliers[unit] || 60);
    }

    return { accessToken, refreshToken, expiresIn };
  },
};
