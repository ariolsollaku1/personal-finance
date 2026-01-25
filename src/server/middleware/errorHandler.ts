/**
 * Global error handling middleware
 * Catches errors thrown in routes and returns consistent error responses
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ErrorCode, sendError } from '../utils/response.js';
import { ZodError } from 'zod';

/**
 * Format Zod validation errors into a readable message
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return issues.join(', ');
}

/**
 * Global error handling middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging (but not in tests)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  // Handle ApiError (thrown intentionally)
  if (err instanceof ApiError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    sendError(
      res,
      ErrorCode.VALIDATION_ERROR,
      formatZodError(err),
      400,
      err.issues
    );
    return;
  }

  // Handle unknown errors
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  sendError(res, ErrorCode.INTERNAL_ERROR, message, 500);
}

/**
 * Async route handler wrapper that catches errors and passes them to error middleware
 *
 * Usage:
 * ```typescript
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
