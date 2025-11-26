/**
 * Standardized error classes and error handling utilities
 */

import { logger } from './logger';

// Base application error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(400, message, true, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(500, message, false, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(503, `${service} service error: ${message}`, false, 'EXTERNAL_SERVICE_ERROR');
  }
}

// Error response format
export interface ErrorResponse {
  code: number;
  message: string;
  status: 'fail' | 'error';
  errors?: Array<{ field: string; message: string }>;
  errorCode?: string;
  stack?: string;
}

// Convert error to standardized response format
export function formatErrorResponse(error: Error | AppError): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      code: error.statusCode,
      message: error.message,
      status: error.isOperational ? 'fail' : 'error',
      errorCode: error.code,
    };

    if (error instanceof ValidationError && error.errors) {
      response.errors = error.errors;
    }

    if (isDevelopment && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }

  // Unknown error - don't expose details in production
  return {
    code: 500,
    message: isDevelopment ? error.message : 'Internal server error',
    status: 'error',
    errorCode: 'INTERNAL_ERROR',
    ...(isDevelopment && error.stack ? { stack: error.stack } : {}),
  };
}

// Log error with appropriate level
export function logError(error: Error | AppError, context?: Record<string, unknown>): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  };

  if (error instanceof AppError) {
    if (error.isOperational) {
      // Operational errors (expected) - log as warning
      logger.warn(`Operational error: ${error.message}`, {
        ...errorInfo,
        statusCode: error.statusCode,
        code: error.code,
      });
    } else {
      // Programming errors (unexpected) - log as error
      logger.error(`Programming error: ${error.message}`, {
        ...errorInfo,
        statusCode: error.statusCode,
        code: error.code,
      });
    }
  } else {
    // Unknown errors - log as error
    logger.error(`Unknown error: ${error.message}`, errorInfo);
  }
}

// Handle async errors in route handlers
export function asyncHandler<T>(
  fn: (req: Request, context?: T) => Promise<Response>
): (req: Request, context?: T) => Promise<Response> {
  return async (req: Request, context?: T) => {
    try {
      return await fn(req, context);
    } catch (error) {
      logError(error as Error, {
        url: req.url,
        method: req.method,
      });

      const errorResponse = formatErrorResponse(error as Error);
      return Response.json(errorResponse, { status: errorResponse.code });
    }
  };
}
