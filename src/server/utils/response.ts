/**
 * Standardized API response utilities
 * Provides consistent response format across all routes
 */

import { Response } from 'express';

// Error codes for programmatic error handling
export const ErrorCode = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

interface ApiErrorPayload {
  code: ErrorCodeType;
  message: string;
  details?: unknown;
}

interface ErrorResponseBody {
  success: false;
  error: ApiErrorPayload;
}

interface SuccessResponseBody<T> {
  success: true;
  data: T;
}

/**
 * Send a standardized success response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: SuccessResponseBody<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(body);
}

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  code: ErrorCodeType,
  message: string,
  statusCode: number,
  details?: unknown
): void {
  const body: ErrorResponseBody = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  res.status(statusCode).json(body);
}

// Convenience methods for common error types

export function badRequest(res: Response, message: string, details?: unknown): void {
  sendError(res, ErrorCode.BAD_REQUEST, message, 400, details);
}

export function validationError(res: Response, message: string, details?: unknown): void {
  sendError(res, ErrorCode.VALIDATION_ERROR, message, 400, details);
}

export function unauthorized(res: Response, message = 'Not authenticated'): void {
  sendError(res, ErrorCode.UNAUTHORIZED, message, 401);
}

export function forbidden(res: Response, message = 'Access denied'): void {
  sendError(res, ErrorCode.FORBIDDEN, message, 403);
}

export function notFound(res: Response, message: string): void {
  sendError(res, ErrorCode.NOT_FOUND, message, 404);
}

export function conflict(res: Response, message: string): void {
  sendError(res, ErrorCode.CONFLICT, message, 409);
}

export function internalError(res: Response, message = 'Internal server error'): void {
  sendError(res, ErrorCode.INTERNAL_ERROR, message, 500);
}

/**
 * Custom error class for API errors that can be thrown and caught by error middleware
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCode.BAD_REQUEST, message, 400, details);
  }

  static validationError(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  static unauthorized(message = 'Not authenticated'): ApiError {
    return new ApiError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(message: string): ApiError {
    return new ApiError(ErrorCode.NOT_FOUND, message, 404);
  }

  static conflict(message: string): ApiError {
    return new ApiError(ErrorCode.CONFLICT, message, 409);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(ErrorCode.INTERNAL_ERROR, message, 500);
  }
}
