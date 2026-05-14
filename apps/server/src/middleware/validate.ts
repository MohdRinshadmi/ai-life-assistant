import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

/**
 * Request Validation Middleware Factory
 *
 * Validates req.body, req.query, and req.params against Zod schemas.
 *
 * Usage:
 *   router.post('/users', validate(createUserSchema), controller.create);
 *
 * Why Zod over Joi/Yup?
 * - First-class TypeScript inference (schema → type automatically)
 * - Lighter bundle size
 * - Better composability (merge, pick, omit, extend)
 * - Same library on frontend and backend (shared package)
 */
interface ValidationSchemas {
  body?: AnyZodObject | ZodEffects<AnyZodObject>;
  query?: AnyZodObject | ZodEffects<AnyZodObject>;
  params?: AnyZodObject | ZodEffects<AnyZodObject>;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }
      next();
    } catch (error) {
      next(error); // Zod errors caught by errorHandler middleware
    }
  };
}
