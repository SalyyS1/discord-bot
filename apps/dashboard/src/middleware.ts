import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/navigation';
import crypto from 'crypto';

const intlMiddleware = createIntlMiddleware(routing);

// CSRF Configuration
const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
const CSRF_EXEMPT_ROUTES = ['/api/auth', '/api/csrf', '/api/payments/sepay/webhook', '/api/payments/stripe/webhook'];

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth', '/pricing', '/terms', '/privacy'];
// Protected API routes that require session
const protectedApiPatterns = ['/api/guilds'];
// Supported locales
const locales = ['vi', 'en'];

function getLocaleFromRequest(request: NextRequest): string {
  // Priority: 1. Cookie, 2. URL path, 3. Accept-Language header, 4. Default

  // 1. Check NEXT_LOCALE cookie first
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // 2. Check URL path
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return segments[0];
  }

  // 3. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (locales.includes(preferredLocale)) {
      return preferredLocale;
    }
  }

  // 4. Default to Vietnamese
  return 'vi';
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Uses constant-time comparison to avoid leaking information about string contents
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF Protection for API routes
  if (pathname.startsWith('/api/')) {
    // Check if route is exempt from CSRF protection
    const isExempt = CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route));

    // Validate CSRF token for mutating methods
    if (!isExempt && PROTECTED_METHODS.includes(request.method)) {
      const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
      const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

      if (!csrfCookie || !csrfHeader || !timingSafeCompare(csrfCookie, csrfHeader)) {
        return NextResponse.json(
          { success: false, error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  // Check if it's an API route or public route
  const isApiRoute = pathname.startsWith('/api');
  const isPublicRoute = publicRoutes.some(
    (route) => pathname.includes(route)
  );
  const isProtectedApiRoute = protectedApiPatterns.some(
    (pattern) => pathname.includes(pattern)
  );
  const isDashboardRoute = pathname.includes('/dashboard');
  const isProfileRoute = pathname.includes('/profile');
  const isAdminRoute = pathname.includes('/admin');
  const isProtectedRoute = isDashboardRoute || isProfileRoute || isAdminRoute;

  // Check for session cookie
  // Priority order: 1) __Secure- prefix (HTTPS), 2) better-auth.session_data (fallback), 3) legacy session_token
  const sessionCookie =
    request.cookies.get('__Secure-better-auth.session_data') ||
    request.cookies.get('better-auth.session_data') ||
    request.cookies.get('better-auth.session_token');

  // Debug logging for authentication flow
  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth Debug]', {
      pathname,
      hasSession: !!sessionCookie,
      sessionCookie: sessionCookie?.name,
      isProtectedRoute,
      isPublicRoute,
    });
  }

  // Check auth for protected API routes (guild-related endpoints)
  if (isProtectedApiRoute && !sessionCookie) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // If no session and trying to access protected route, redirect to login BEFORE i18n middleware
  if (!sessionCookie && isProtectedRoute) {
    const locale = getLocaleFromRequest(request);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Apply i18n middleware for all other routes
  const response = intlMiddleware(request);

  // Preserve NEXT_LOCALE cookie if it exists
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (localeCookie && response instanceof NextResponse) {
    response.cookies.set('NEXT_LOCALE', localeCookie.value, {
      path: '/',
      maxAge: 31536000, // 1 year
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Match root
    '/',
    // Match locale paths
    '/(vi|en)/:path*',
    // Match non-locale paths that should be redirected
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
