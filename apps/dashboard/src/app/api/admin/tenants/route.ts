import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { requireAdminAccess, auditAdminAction } from '@/lib/admin/admin-access-control-guard';
import { getServerSession } from '@/lib/session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - List all tenants with pagination and search
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdminAccess();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { botUsername: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status && ['PENDING', 'ACTIVE', 'SUSPENDED', 'ERROR'].includes(status)) {
      where.status = status;
    }

    // Fetch tenants with user info
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    // Audit action
    const session = await getServerSession();
    await auditAdminAction({
      userId: session!.user!.id,
      action: 'LIST_TENANTS',
      metadata: { page, limit, search, status },
    });

    return NextResponse.json({
      success: true,
      data: {
        tenants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('[Admin] Failed to list tenants', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

// PATCH - Update tenant status or tier
export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdminAccess();
    if (authError) return authError;

    const session = await getServerSession();
    const body = await request.json();
    const { tenantId, status, tier } = body;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status && ['PENDING', 'ACTIVE', 'SUSPENDED', 'ERROR'].includes(status)) {
      updates.status = status;
    }
    if (tier && ['FREE', 'PRO', 'ULTRA'].includes(tier)) {
      updates.tier = tier;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updates,
    });

    // Audit action
    await auditAdminAction({
      userId: session!.user!.id,
      action: 'UPDATE_TENANT',
      targetId: tenantId,
      metadata: { updates },
    });

    logger.info('[Admin] Tenant updated', {
      tenantId,
      adminId: session!.user!.id,
      updates,
    });

    return NextResponse.json({ success: true, data: tenant });
  } catch (error) {
    logger.error('[Admin] Failed to update tenant', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

// DELETE - Delete tenant and cascade data
export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdminAccess();
    if (authError) return authError;

    const session = await getServerSession();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Delete tenant (cascade deletes audit logs)
    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    // Audit action
    await auditAdminAction({
      userId: session!.user!.id,
      action: 'DELETE_TENANT',
      targetId: tenantId,
    });

    logger.warn('[Admin] Tenant deleted', {
      tenantId,
      adminId: session!.user!.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Admin] Failed to delete tenant', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}
