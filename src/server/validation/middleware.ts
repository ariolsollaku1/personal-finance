/**
 * Express middleware for Zod validation
 * Provides consistent error handling for request validation
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { validationError } from '../utils/response.js';

/**
 * Formats Zod validation errors into a user-friendly message
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return issues.join(', ');
}

/**
 * Middleware factory for validating request body against a Zod schema
 *
 * Usage:
 * ```typescript
 * router.post('/', validateBody(createAccountSchema), async (req, res) => {
 *   // req.body is now typed and validated
 * });
 * ```
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return validationError(res, formatZodError(result.error), result.error.issues);
    }

    // Replace body with parsed/transformed data
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory for validating request params against a Zod schema
 *
 * Usage:
 * ```typescript
 * router.get('/:id', validateParams(idParamSchema), async (req, res) => {
 *   const { id } = req.params; // id is now a number
 * });
 * ```
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return validationError(res, formatZodError(result.error), result.error.issues);
    }

    // Replace params with parsed/transformed data
    req.params = result.data as any;
    next();
  };
}

/**
 * Middleware factory for validating query parameters against a Zod schema
 *
 * Usage:
 * ```typescript
 * router.get('/search', validateQuery(searchQuerySchema), async (req, res) => {
 *   const { q, limit } = req.query;
 * });
 * ```
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return validationError(res, formatZodError(result.error), result.error.issues);
    }

    // Replace query with parsed/transformed data
    req.query = result.data as any;
    next();
  };
}

/**
 * Helper function for inline validation (without middleware)
 * Returns the validated data or throws a formatted error response
 *
 * Usage:
 * ```typescript
 * router.post('/', async (req, res) => {
 *   const data = validate(createAccountSchema, req.body, res);
 *   if (!data) return; // Response already sent
 *   // Use validated data...
 * });
 * ```
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  res: Response
): T | null {
  const result = schema.safeParse(data);

  if (!result.success) {
    validationError(res, formatZodError(result.error), result.error.issues);
    return null;
  }

  return result.data;
}
