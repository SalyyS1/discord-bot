/**
 * User Guilds API Route
 * Returns accessible guilds for authenticated user
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { getUserAccessibleGuilds } from '@/lib/auth/guild-access-validator';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const guilds = await getUserAccessibleGuilds(session.user.id);

    return NextResponse.json({
      guilds,
      total: guilds.length,
    });
  } catch (error) {
    console.error('Error fetching user guilds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
}
