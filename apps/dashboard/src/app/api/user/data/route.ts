/**
 * User Data API Route
 * Handles GDPR data export and account deletion
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Export user data (GDPR compliance)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: {
          select: {
            providerId: true,
            accountId: true,
            createdAt: true,
          },
        },
        sessions: {
          select: {
            createdAt: true,
            expiresAt: true,
            ipAddress: true,
            userAgent: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Sanitize sensitive data
    const exportData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accounts: user.accounts,
      sessions: user.sessions.map((s) => ({
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
      })),
      exportDate: new Date().toISOString(),
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="user-data-${user.id}-${Date.now()}.json"`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}

/**
 * Delete user account (GDPR compliance)
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { confirmation } = body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        { error: 'Invalid confirmation' },
        { status: 400 }
      );
    }

    // Delete user and cascade all related data
    // Prisma should handle cascading deletes based on schema
    await prisma.user.delete({
      where: {
        id: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
