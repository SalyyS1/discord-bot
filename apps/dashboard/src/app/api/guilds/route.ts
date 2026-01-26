import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const guilds = await prisma.guild.findMany({
      where: { leftAt: null },
      select: {
        id: true,
        name: true,
        joinedAt: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    logger.debug('[API /guilds] Found guilds', { count: guilds.length });

    // Add icon field (null for now, can be fetched from Discord API later)
    const guildsWithIcon = guilds.map(g => ({
      ...g,
      icon: null,
    }));

    return NextResponse.json({ guilds: guildsWithIcon });
  } catch (error) {
    logger.error(`Failed to fetch guilds: ${error}`);
    return NextResponse.json({ guilds: [] });
  }
}

