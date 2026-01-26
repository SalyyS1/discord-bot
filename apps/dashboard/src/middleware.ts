import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/navigation';

const intlMiddleware = createIntlMiddleware(routing);

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth', '/pricing', '/terms', '/privacy'];
// Protected API routes that require session
const protectedApiPatterns = ['/api/guilds'];
// Supported locales
const locales = ['vi', 'en'];

function getLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return segments[0];
  }
  return 'vi';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's an API route or public route
  const isApiRoute = pathname.startsWith('/api');
  const isPublicRoute = publicRoutes.some(
    (route) => pathname.includes(route)
  );
  const isProtectedApiRoute = protectedApiPatterns.some(
    (pattern) => pathname.includes(pattern)
  );
  const isDashboardRoute = pathname.includes('/dashboard');

  // Check for session cookie (better-auth uses different names in secure/non-secure contexts)
  const sessionCookie =
    request.cookies.get('__Secure-better-auth.session_data') ||
    request.cookies.get('better-auth.session_data') ||
    request.cookies.get('better-auth.session_token');

  // Check auth for protected API routes (guild-related endpoints)
  if (isProtectedApiRoute && !sessionCookie) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // If no session and trying to access dashboard, redirect to login BEFORE i18n middleware
  if (!sessionCookie && isDashboardRoute) {
    const locale = getLocale(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Apply i18n middleware for all other routes
  return intlMiddleware(request);
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
