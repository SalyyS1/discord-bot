import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { requireAdminAccess, auditAdminAction } from '@/lib/admin/admin-access-control-guard';
import { getServerSession } from '@/lib/session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - List all users with pagination and search
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdminAccess();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch users with subscription and tenant count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            select: {
              tier: true,
              expiresAt: true,
            },
          },
          tenants: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          accounts: {
            where: { providerId: 'discord' },
            select: {
              accountId: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Audit action
    const session = await getServerSession();
    await auditAdminAction({
      userId: session!.user!.id,
      action: 'LIST_USERS',
      metadata: { page, limit, search },
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('[Admin] Failed to list users', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH - Update user subscription
export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdminAccess();
    if (authError) return authError;

    const session = await getServerSession();
    const body = await request.json();
    const { userId, tier, durationDays } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    if (!tier || !['FREE', 'PREMIUM'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Calculate expiration
    const expiresAt = tier === 'PREMIUM' && durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    // Upsert subscription
    const subscription = await prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        expiresAt,
      },
      update: {
        tier,
        expiresAt,
      },
    });

    // Audit action
    await auditAdminAction({
      userId: session!.user!.id,
      action: 'UPDATE_USER_SUBSCRIPTION',
      targetId: userId,
      metadata: { tier, durationDays, expiresAt },
    });

    logger.info('[Admin] User subscription updated', {
      userId,
      adminId: session!.user!.id,
      tier,
      expiresAt,
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    logger.error('[Admin] Failed to update user subscription', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
