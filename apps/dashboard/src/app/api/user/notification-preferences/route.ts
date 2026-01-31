/**
 * User Preferences API Route
 * Manages user notification preferences
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user preferences
    // This assumes preferences are stored in user table or separate preferences table
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        // Add preferences fields when schema is updated
      },
    });

    // Default preferences for now
    const preferences = {
      emailNotifications: true,
      discordDMs: false,
      serverAlerts: true,
      weeklyDigest: false,
      securityAlerts: true,
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notifications } = body;

    if (!notifications) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // TODO: Store preferences in database
    // For now, just acknowledge the update
    // When schema is updated, uncomment below:
    /*
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferences: notifications,
      },
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
