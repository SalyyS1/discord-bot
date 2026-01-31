import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-guard';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Check database health
    let databaseStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'down';
    }

    // Check API health (if we're here, API is up)
    const apiStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

    // Check Discord bot health (placeholder - would need actual bot status)
    const discordStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

    return NextResponse.json({
      database: databaseStatus,
      api: apiStatus,
      discord: discordStatus,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        database: 'down',
        api: 'degraded',
        discord: 'down',
      },
      { status: 503 }
    );
  }
}
