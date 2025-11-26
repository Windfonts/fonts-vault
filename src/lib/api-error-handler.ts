/**
 * API error handling utilities
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  AppError,
  ValidationError,
  formatErrorResponse,
  logError,
  type ErrorResponse,
} from './errors';

// Re-export error classes for convenience
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
} from './errors';

/**
 * Handle errors in API routes and return standardized responses
 */
export function handleApiError(error: unknown, context?: Record<string, unknown>): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError(
      'Validation failed',
      error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
    );

    logError(validationError, context);
    const response = formatErrorResponse(validationError);
    return NextResponse.json(response, { status: response.code });
  }

  // Handle known application errors
  if (error instanceof AppError) {
    logError(error, context);
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: response.code });
  }

  // Handle unknown errors
  const unknownError = error instanceof Error ? error : new Error(String(error));
  logError(unknownError, context);
  const response = formatErrorResponse(unknownError);
  return NextResponse.json(response, { status: response.code });
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandler<T = unknown>(
  handler: (request: Request, context?: T) => Promise<NextResponse>
) {
  return async (request: Request, context?: T): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, {
        url: request.url,
        method: request.method,
        context,
      });
    }
  };
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  message = 'Success',
  status = 200
): NextResponse<{
  code: number;
  message: string;
  data: T;
}> {
  return NextResponse.json(
    {
      code: status,
      message,
      data,
    },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  code = 500,
  errors?: Array<{ field: string; message: string }>
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    code,
    message,
    status: code < 500 ? 'fail' : 'error',
    ...(errors && { errors }),
  };

  return NextResponse.json(response, { status: code });
}
