import { z } from 'zod';
import { VALIDATION } from '@ai-life/shared';

/**
 * Auth Validation Schemas
 *
 * These Zod schemas serve as:
 * 1. Runtime validation (middleware)
 * 2. TypeScript type inference (no separate type definitions needed)
 * 3. Documentation (schema IS the spec)
 *
 * Shared VALIDATION constants ensure mobile and server use the same limits.
 */

export const registerSchema = {
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .max(VALIDATION.EMAIL_MAX_LENGTH)
      .transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
      .max(VALIDATION.PASSWORD_MAX_LENGTH),
    displayName: z
      .string()
      .min(VALIDATION.DISPLAY_NAME_MIN_LENGTH, `Display name must be at least ${VALIDATION.DISPLAY_NAME_MIN_LENGTH} characters`)
      .max(VALIDATION.DISPLAY_NAME_MAX_LENGTH)
      .trim(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .transform((v) => v.toLowerCase().trim()),
    password: z.string().min(1, 'Password is required'),
    deviceInfo: z.string().optional(),
  }),
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};

// Inferred types from schemas
export type RegisterInput = z.infer<typeof registerSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
export type RefreshInput = z.infer<typeof refreshSchema.body>;
