import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Admin Reviews API Route
 * Returns all reviews (including pending and rejected) for admin moderation
 */

// Admin user IDs - should be in env variable
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);

async function isAdmin(userId: string): Promise<boolean> {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * GET /api/admin/reviews
 * Admin only - returns all reviews with all statuses
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const reviews = await db.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [
        {
          status: 'asc', // PENDING first
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error('Failed to fetch admin reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
