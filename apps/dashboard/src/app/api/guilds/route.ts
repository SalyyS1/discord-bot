import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { logger } from '@/lib/logger';
import { getServerSession } from '@/lib/session';
import { getUserDiscordGuilds } from '@/lib/discord-oauth';

// MANAGE_GUILD permission bit (0x20)
const MANAGE_GUILD_PERMISSION = BigInt(0x20);

// Admin Discord IDs - these users can see ALL guilds
const ADMIN_DISCORD_IDS = ['784728722459983874']; // saly.0105

export async function GET() {
  try {
    // Check session - require authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Discord account to check if they're an admin
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: 'discord' },
      select: { accountId: true },
    });

    const isAdmin = account && ADMIN_DISCORD_IDS.includes(account.accountId);

    // If admin, return ALL guilds the bot is in
    if (isAdmin) {
      const allGuilds = await prisma.guild.findMany({
        where: { leftAt: null },
        select: {
          id: true,
          name: true,
          joinedAt: true,
        },
        orderBy: { joinedAt: 'desc' },
      });

      logger.info('[API /guilds] Admin access - returning all guilds', {
        userId: session.user.id,
        discordId: account.accountId,
        guildsCount: allGuilds.length,
      });

      return NextResponse.json({
        guilds: allGuilds.map(g => ({ ...g, icon: null })),
        isAdmin: true,
      });
    }

    // Get user's Discord guilds with permissions
    const userGuilds = await getUserDiscordGuilds(session.user.id);

    // Filter to only guilds where user has MANAGE_GUILD permission
    const manageableGuildIds = userGuilds
      .filter(g => (BigInt(g.permissions) & MANAGE_GUILD_PERMISSION) !== BigInt(0))
      .map(g => g.id);

    // Get bot guilds that the user can manage
    const botGuilds = await prisma.guild.findMany({
      where: {
        id: { in: manageableGuildIds },
        leftAt: null
      },
      select: {
        id: true,
        name: true,
        joinedAt: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    logger.debug('[API /guilds] Found guilds for user', {
      userId: session.user.id,
      userGuildsCount: userGuilds.length,
      manageableCount: manageableGuildIds.length,
      botGuildsCount: botGuilds.length
    });

    // Merge icon from user's guild data
    const guildsWithIcon = botGuilds.map(g => {
      const userGuild = userGuilds.find(ug => ug.id === g.id);
      return {
        ...g,
        icon: userGuild?.icon || null,
      };
    });

    return NextResponse.json({ guilds: guildsWithIcon, isAdmin: false });
  } catch (error) {
    logger.error(`Failed to fetch guilds: ${error}`);
    return NextResponse.json({ guilds: [], isAdmin: false });
  }
}
