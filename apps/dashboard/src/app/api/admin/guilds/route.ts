import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-guard';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [guilds, total] = await Promise.all([
      prisma.guild.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.guild.count({ where }),
    ]);

    return NextResponse.json({
      guilds,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch guilds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
}
