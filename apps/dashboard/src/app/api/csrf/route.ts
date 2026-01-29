import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const CSRF_COOKIE_NAME = '__Host-csrf';

/**
 * GET /api/csrf
 * Generates and sets CSRF token cookie
 */
export async function GET(request: NextRequest) {
  try {
    // Generate CSRF token
    const csrfToken = randomBytes(32).toString('hex');

    // Create response
    const response = NextResponse.json({ success: true });

    // Set secure cookie
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
