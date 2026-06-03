import { Router } from 'express';
import { authController } from './auth.controller';
import { validate, authenticate } from '@middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';

/**
 * Auth Routes
 *
 * POST /auth/register  — Create new account (public)
 * POST /auth/login     — Login (public)
 * POST /auth/refresh   — Refresh tokens (public, requires valid refresh token)
 * POST /auth/logout    — Logout all sessions (protected)
 * GET  /auth/me        — Get current user profile (protected)
 */

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);

// Protected routes (require valid access token)
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export { router as authRoutes };
