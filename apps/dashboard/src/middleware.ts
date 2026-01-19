import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/navigation';

const intlMiddleware = createIntlMiddleware(routing);

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's an API route or public route
  const isApiRoute = pathname.startsWith('/api');
  const isPublicRoute = publicRoutes.some(
    (route) => pathname.includes(route)
  );

  // Apply i18n middleware first
  const response = intlMiddleware(request);

  // Skip auth check for API routes and public routes
  if (isApiRoute || isPublicRoute) {
    return response;
  }

  // Check for session cookie (simplified check)
  const sessionCookie = request.cookies.get('better-auth.session_token');

  // If no session and trying to access protected route, redirect to login
  if (!sessionCookie && pathname.includes('/dashboard')) {
    const locale = pathname.split('/')[1] || 'vi';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/(vi|en)/:path*'],
};
