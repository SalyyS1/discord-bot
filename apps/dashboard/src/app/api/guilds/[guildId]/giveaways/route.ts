import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;

  try {
    const giveaways = await prisma.giveaway.findMany({
      where: {
        guildId,
        ...(status ? { status: status as 'ACTIVE' | 'ENDED' | 'CANCELLED' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: giveaways });
  } catch (error) {
    console.error('Error fetching giveaways:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
