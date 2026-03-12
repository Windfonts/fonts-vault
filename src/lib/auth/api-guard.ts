import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './session';
import {
  AuthenticationError,
  AuthorizationError,
  handleApiError as handleError,
} from '@/lib/api-error-handler';

/**
 * API route guard utility
 * Provides helper functions to protect API routes and verify authentication
 */

// Re-export error classes for backward compatibility
export { AuthenticationError, AuthorizationError } from '@/lib/api-error-handler';

/**
 * Verify that the request is authenticated
 * Returns the session if authenticated, or throws an error
 */
export async function verifyAuth() {
  const session = await getSession();

  if (!session?.user) {
    throw new AuthenticationError('未授权访问，请先登录');
  }

  return session;
}

/**
 * Verify that the authenticated user has admin role
 * Returns the session if user is admin, or throws an error
 */
export async function verifyAdmin() {
  const session = await verifyAuth();

  if (session.user.role !== 'admin') {
    throw new AuthorizationError('权限不足，需要管理员权限');
  }

  return session;
}

/**
 * Handle API errors and return appropriate response
 * Re-export from centralized error handler
 */
export const handleApiError = handleError;

/**
 * Type for authenticated session (guaranteed to have user)
 */
export type AuthenticatedSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/**
 * Wrapper for API route handlers that require authentication
 * Usage:
 *
 * export const POST = withAuth(async (req, session) => {
 *   // Your handler code here
 *   // session is guaranteed to exist
 * });
 */
export function withAuth(
  handler: (req: NextRequest, session: AuthenticatedSession) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const session = await verifyAuth();
      return await handler(req, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Wrapper for API route handlers that require admin role
 * Usage:
 *
 * export const DELETE = withAdmin(async (req, session) => {
 *   // Your handler code here
 *   // session is guaranteed to exist and user is admin
 * });
 */
export function withAdmin<TContext = unknown>(
  handler: (
    req: NextRequest,
    session: AuthenticatedSession,
    context?: TContext
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: TContext) => {
    try {
      const session = await verifyAdmin();
      return await handler(req, session, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
