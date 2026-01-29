import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { requireAdminAccess, auditAdminAction } from '@/lib/admin/admin-access-control-guard';
import { getServerSession } from '@/lib/session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface AdminStats {
  users: {
    total: number;
    free: number;
    premium: number;
  };
  tenants: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
    error: number;
  };
  guilds: {
    total: number;
    active: number;
  };
  bots: {
    running: number;
    stopped: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    userId: string;
    timestamp: Date;
    metadata: unknown;
  }>;
}

export async function GET() {
  try {
    // Check admin access
    const authError = await requireAdminAccess();
    if (authError) return authError;

    const session = await getServerSession();

    // Aggregate stats in parallel
    const [
      totalUsers,
      freeUsers,
      premiumUsers,
      tenantStats,
      totalGuilds,
      activeGuilds,
      runningBots,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userSubscription.count({ where: { tier: 'FREE' } }),
      prisma.userSubscription.count({ where: { tier: 'PREMIUM' } }),
      prisma.tenant.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.guild.count(),
      prisma.guild.count({ where: { leftAt: null } }),
      prisma.tenant.count({ where: { isRunning: true } }),
      prisma.tenantAuditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          action: true,
          userId: true,
          timestamp: true,
          metadata: true,
        },
      }),
    ]);

    // Process tenant stats
    const tenantsByStatus = {
      total: 0,
      active: 0,
      suspended: 0,
      pending: 0,
      error: 0,
    };

    tenantStats.forEach((stat) => {
      tenantsByStatus.total += stat._count;
      tenantsByStatus[stat.status.toLowerCase() as keyof typeof tenantsByStatus] = stat._count;
    });

    const stats: AdminStats = {
      users: {
        total: totalUsers,
        free: freeUsers,
        premium: premiumUsers,
      },
      tenants: tenantsByStatus,
      guilds: {
        total: totalGuilds,
        active: activeGuilds,
      },
      bots: {
        running: runningBots,
        stopped: tenantsByStatus.total - runningBots,
      },
      recentActivity,
    };

    // Audit admin action
    await auditAdminAction({
      userId: session!.user!.id,
      action: 'VIEW_STATS',
    });

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    logger.error('[Admin] Failed to fetch stats', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
