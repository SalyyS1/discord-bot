import {
  Message,
  GuildMember,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { getLevelFromXp, getRandomXp } from './xpCalculator.js';
import { logger } from '../../utils/logger.js';

/**
 * Leveling/XP system module
 */
export class LevelingModule {
  /**
   * Process message for XP gain
   */
  static async processMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    });

    if (!settings?.levelingEnabled) return;

    // Check cooldown in Redis
    const cooldownKey = `xp:cooldown:${message.guild.id}:${message.author.id}`;

    try {
      const onCooldown = await redis.exists(cooldownKey);
      if (onCooldown) return;

      // Set cooldown
      await redis.setex(cooldownKey, settings.xpCooldownSeconds || 60, '1');
    } catch (error) {
      logger.error('Redis error in XP cooldown check:', error);
      return; // Skip XP gain if Redis is unavailable
    }

    // Get or create member record
    const member = await prisma.member.upsert({
      where: {
        discordId_guildId: {
          discordId: message.author.id,
          guildId: message.guild.id,
        },
      },
      create: {
        discordId: message.author.id,
        guildId: message.guild.id,
      },
      update: {},
    });

    // Calculate XP gain
    const xpGain = getRandomXp(settings.xpMin || 15, settings.xpMax || 25);
    const oldLevel = member.level;
    const newXp = member.xp + xpGain;
    const newLevel = getLevelFromXp(newXp);

    // Update member
    await prisma.member.update({
      where: { id: member.id },
      data: {
        xp: newXp,
        level: newLevel,
        totalMessages: { increment: 1 },
        lastXpGain: new Date(),
      },
    });

    // Invalidate leaderboard cache
    try {
      await redis.del(`leaderboard:${message.guild.id}`);
    } catch {
      // Non-critical error
    }

    // Check for level up
    if (newLevel > oldLevel && message.member) {
      await this.handleLevelUp(
        message.member,
        oldLevel,
        newLevel,
        message.channel as TextChannel
      );
    }
  }

  /**
   * Handle level up event
   */
  private static async handleLevelUp(
    member: GuildMember,
    oldLevel: number,
    newLevel: number,
    channel: TextChannel
  ): Promise<void> {
    // Check for role rewards
    const roleRewards = await prisma.levelRole.findMany({
      where: {
        guildId: member.guild.id,
        level: { lte: newLevel, gt: oldLevel },
      },
      orderBy: { level: 'asc' },
    });

    // Assign role rewards
    const assignedRoles: string[] = [];
    for (const reward of roleRewards) {
      const role = member.guild.roles.cache.get(reward.roleId);
      if (role && !member.roles.cache.has(role.id)) {
        try {
          await member.roles.add(role, `Level ${reward.level} reward`);
          assignedRoles.push(role.name);
        } catch (error) {
          logger.error(`Failed to assign level role: ${error}`);
        }
      }
    }

    // Send level up notification
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎉 Level Up!')
      .setDescription(
        `Congratulations ${member}! You've reached **Level ${newLevel}**!`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    if (assignedRoles.length > 0) {
      embed.addFields({
        name: '🏆 New Roles',
        value: assignedRoles.join(', '),
      });
    }

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send level up notification:', error);
    }
  }

  /**
   * Get member's rank in guild
   */
  static async getRank(guildId: string, discordId: string): Promise<number> {
    const member = await prisma.member.findUnique({
      where: { discordId_guildId: { discordId, guildId } },
    });

    if (!member) return 0;

    const rank = await prisma.member.count({
      where: {
        guildId,
        xp: { gt: member.xp },
      },
    });

    return rank + 1;
  }

  /**
   * Get member's XP data
   */
  static async getMemberData(
    guildId: string,
    discordId: string
  ): Promise<{ xp: number; level: number } | null> {
    const member = await prisma.member.findUnique({
      where: { discordId_guildId: { discordId, guildId } },
      select: { xp: true, level: true },
    });
    return member;
  }
}
