/**
 * Guild Access Middleware
 * Validates user access to guild before allowing route access
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { validateUserGuildAccess } from '@/lib/auth/guild-access-validator';

export async function guildAccessMiddleware(
  request: NextRequest,
  guildId: string
) {
  try {
    // Get session using better-auth API
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const hasAccess = await validateUserGuildAccess(session.user.id, guildId);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Forbidden - You do not have access to this guild',
          details: 'You need MANAGE_GUILD permission and the bot must be present in the server'
        },
        { status: 403 }
      );
    }

    return null; // Access granted
  } catch (error) {
    console.error('Guild access middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract guild ID from URL path
 */
export function extractGuildIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/dashboard\/(\d+)/);
  return match ? match[1] : null;
}
