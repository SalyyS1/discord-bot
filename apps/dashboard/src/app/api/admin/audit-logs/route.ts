import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-guard';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // AuditLog model not yet implemented in schema
    // TODO: Add AuditLog model to Prisma schema
    const formattedLogs: Array<{
      id: string;
      action: string;
      userId: string;
      userEmail: string;
      metadata: unknown;
      ipAddress: string | null;
      createdAt: string;
    }> = [];

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
