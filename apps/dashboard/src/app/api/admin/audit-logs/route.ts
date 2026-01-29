import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-guard';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      userEmail: log.user.email || 'Unknown',
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      logs: formattedLogs,
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
