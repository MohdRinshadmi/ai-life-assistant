import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated, sendNoContent } from '@shared/utils/response';
import { logger } from '@config';

/**
 * Auth Controller — HTTP request/response handling
 *
 * Pattern: Controller is thin — it only:
 * 1. Extracts data from the request (already validated by middleware)
 * 2. Calls the service
 * 3. Sends the response
 *
 * All business logic lives in the service layer.
 */

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, displayName } = req.body;

      const result = await authService.register({ email, password, displayName });

      sendCreated(res, {
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      logger.error({ error }, 'Registration failed');
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, deviceInfo } = req.body;

      const result = await authService.login({ email, password, deviceInfo });

      sendSuccess(res, {
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshTokens(refreshToken);

      sendSuccess(res, {
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await authService.logout(userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await authService.getProfile(userId);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  },
};
