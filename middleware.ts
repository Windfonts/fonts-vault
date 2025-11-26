import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

/**
 * Next.js Middleware for authentication and authorization
 *
 * Protected routes:
 * - /admin/* - Requires authentication
 * - API routes with POST, PUT, DELETE methods - Requires authentication
 *
 * Public routes:
 * - / - Home page
 * - /fonts/* - Font browsing and details
 * - /docs/* - Documentation
 * - /login - Login page
 * - GET /api/fonts - Font listing
 * - GET /api/css - CSS generation
 * - GET /api/brands - Brand listing
 * - GET /api/categories - Category listing
 */

// Define public paths that don't require authentication
const publicPaths = ['/', '/login', '/fonts', '/docs'];

// Define public API paths (GET only)
const publicApiPaths = ['/api/auth', '/api/fonts', '/api/css', '/api/brands', '/api/categories'];

// Check if a path matches any pattern in the list
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  });
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const disableAuth = process.env.DISABLE_AUTH === 'true';

  // Allow access to static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check if this is an admin route
  const isAdminRoute = pathname.startsWith('/admin');

  // Check if this is an API route
  const isApiRoute = pathname.startsWith('/api');

  // Handle admin routes - require authentication
  if (isAdminRoute) {
    if (disableAuth) {
      return NextResponse.next();
    }
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Handle API routes
  if (isApiRoute) {
    const method = req.method;

    // Allow all auth-related API calls
    if (pathname.startsWith('/api/auth')) {
      return NextResponse.next();
    }

    // For public API paths, allow GET requests without authentication
    if (method === 'GET' && matchesPath(pathname, publicApiPaths)) {
      return NextResponse.next();
    }

    // All other API routes (POST, PUT, DELETE, or non-public GET) require authentication
    if (!isLoggedIn && !disableAuth) {
      return NextResponse.json(
        {
          code: 401,
          message: '未授权访问，请先登录',
          status: 'error',
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // Handle public routes - allow access without authentication
  if (matchesPath(pathname, publicPaths)) {
    return NextResponse.next();
  }

  // Redirect to login if trying to access protected route without authentication
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
