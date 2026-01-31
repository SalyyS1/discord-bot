import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * User Preferences API Route
 *
 * Stores user preferences including locale in cookies
 * Since the User model doesn't have preference fields, we use cookies for persistence
 */

interface UserPreferences {
  ticketNotifications: boolean;
  securityAlerts: boolean;
  botUpdates: boolean;
  timezone: string;
  locale?: string; // Add locale preference
}

const DEFAULT_PREFERENCES: UserPreferences = {
  ticketNotifications: true,
  securityAlerts: true,
  botUpdates: false,
  timezone: 'utc',
  locale: 'vi',
};

const PREFERENCES_COOKIE = 'user_preferences';

/**
 * GET /api/user/preferences
 * Fetch current user preferences
 */
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read from cookie
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split('; ')
      .filter(Boolean)
      .map((c) => {
        const [key, ...value] = c.split('=');
        return [key, value.join('=')];
      })
  );

  let preferences = DEFAULT_PREFERENCES;

  if (cookies[PREFERENCES_COOKIE]) {
    try {
      const decoded = decodeURIComponent(cookies[PREFERENCES_COOKIE]);
      preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(decoded) };
    } catch {
      // Invalid cookie, use defaults
    }
  }

  return NextResponse.json({ data: preferences });
}

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
export async function PATCH(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();

    // Validate locale if provided
    if (updates.locale && !['vi', 'en'].includes(updates.locale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Must be "vi" or "en"' },
        { status: 400 }
      );
    }

    // Read existing preferences from cookie
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader
        .split('; ')
        .filter(Boolean)
        .map((c) => {
          const [key, ...value] = c.split('=');
          return [key, value.join('=')];
        })
    );

    let currentPreferences = DEFAULT_PREFERENCES;

    if (cookies[PREFERENCES_COOKIE]) {
      try {
        const decoded = decodeURIComponent(cookies[PREFERENCES_COOKIE]);
        currentPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(decoded) };
      } catch {
        // Invalid cookie, use defaults
      }
    }

    // Merge updates
    const newPreferences = { ...currentPreferences, ...updates };

    // Create response with updated cookie
    const response = NextResponse.json({ data: newPreferences });

    // Set preferences cookie with 1 year expiry
    const cookieValue = encodeURIComponent(JSON.stringify(newPreferences));
    response.cookies.set(PREFERENCES_COOKIE, cookieValue, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Also set NEXT_LOCALE cookie if locale was updated
    if (updates.locale) {
      response.cookies.set('NEXT_LOCALE', updates.locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false, // Allow JS access for client-side routing
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
