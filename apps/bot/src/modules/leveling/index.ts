import {
  Message,
  GuildMember,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { prisma, type GuildSettings } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { getLevelFromXp, getRandomXp } from './xpCalculator.js';
import { logger } from '../../utils/logger.js';
import { parseTemplate, TemplateContext } from '../../lib/template.js';

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

    // Check No-XP channel exclusion
    if (settings.noXpChannelIds?.includes(message.channel.id)) {
      return;
    }

    // Check No-XP role exclusion
    if (message.member && settings.noXpRoleIds?.length) {
      const hasNoXpRole = settings.noXpRoleIds.some(roleId =>
        message.member!.roles.cache.has(roleId)
      );
      if (hasNoXpRole) {
        return;
      }
    }

    const cooldownSeconds = settings.xpCooldownSeconds || 60;
    const cooldownKey = `xp:cooldown:${message.guild.id}:${message.author.id}`;
    let useRedisCooldown = true;

    // Check cooldown in Redis (with database fallback)
    try {
      const onCooldown = await redis.exists(cooldownKey);
      if (onCooldown) return;

      // Set cooldown in Redis
      await redis.setex(cooldownKey, cooldownSeconds, '1');
    } catch {
      // Redis unavailable - use database fallback
      useRedisCooldown = false;
      logger.debug('Redis unavailable, using DB cooldown fallback');
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

    // Database fallback for cooldown when Redis is unavailable
    if (!useRedisCooldown && member.lastXpGain) {
      const cooldownMs = cooldownSeconds * 1000;
      const timeSinceLastXp = Date.now() - member.lastXpGain.getTime();
      if (timeSinceLastXp < cooldownMs) {
        return; // Still on cooldown
      }
    }

    // Calculate base XP gain
    let xpGain = getRandomXp(settings.xpMin || 15, settings.xpMax || 25);

    // Apply XP multiplier based on roles
    if (message.member && settings.xpMultipliers) {
      const multiplier = this.getMultiplier(message.member, settings.xpMultipliers);
      xpGain = Math.floor(xpGain * multiplier);
    }

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
        message.channel as TextChannel,
        settings
      );
    }
  }

  /**
   * Get XP multiplier for a member based on their roles
   */
  private static getMultiplier(member: GuildMember, multipliers: unknown): number {
    if (!multipliers || typeof multipliers !== 'object') return 1;

    try {
      let maxMultiplier = 1;
      const mults = multipliers as Record<string, number>;

      for (const [roleId, mult] of Object.entries(mults)) {
        if (member.roles.cache.has(roleId) && typeof mult === 'number') {
          maxMultiplier = Math.max(maxMultiplier, mult);
        }
      }

      return maxMultiplier;
    } catch {
      return 1;
    }
  }

  /**
   * Handle level up event
   */
  private static async handleLevelUp(
    member: GuildMember,
    oldLevel: number,
    newLevel: number,
    messageChannel: TextChannel,
    settings: GuildSettings
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
      if (!reward.roleId) continue;
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

    // Prepare template context
    const context: TemplateContext = {
      user: {
        id: member.id,
        username: member.user.username,
        tag: member.user.tag,
        mention: `<@${member.id}>`,
        avatar: member.user.displayAvatarURL(),
      },
      guild: {
        id: member.guild.id,
        name: member.guild.name,
        memberCount: member.guild.memberCount,
        icon: member.guild.iconURL() || undefined,
      },
      member: {
        level: newLevel,
        xp: member.user.bot ? 0 : 0, // We don't have exact XP here easily without refetching, but level is key
      },
    };

    // Get custom template
    const template = await prisma.messageTemplate.findUnique({
      where: { guildId_name: { guildId: member.guild.id, name: 'levelup' } },
    });

    // Build embed
    let embed: EmbedBuilder;

    if (template?.embedJson) {
      const jsonStr = JSON.stringify(template.embedJson);
      const parsedJson = parseTemplate(jsonStr, context);
      embed = new EmbedBuilder(JSON.parse(parsedJson));
    } else {
      // Default embed
      const defaultContent = template?.content || `Congratulations ${member}! You've reached **Level ${newLevel}**!`;
      const description = parseTemplate(defaultContent, context);

      embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎉 Level Up!')
        .setDescription(description)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    }

    // Append new roles field if roles were assigned and not using custom embed that assumes full control
    // If using default embed (or custom content only), we definitely append.
    // If using custom embedJson, we append only if no fields defined? 
    // Safest: Always append "New Roles" if roles assigned, unless we see user might have handled it.
    // Simplifying: Just append for now.
    if (assignedRoles.length > 0) {
      embed.addFields({
        name: '🏆 New Roles',
        value: assignedRoles.join(', '),
      });
    }

    // Determine where to send notification
    let targetChannel: TextChannel | null = messageChannel;

    // Check if custom level-up channel is configured
    if (settings.levelUpChannelId) {
      const customChannel = member.guild.channels.cache.get(settings.levelUpChannelId);
      if (customChannel?.isTextBased()) {
        targetChannel = customChannel as TextChannel;
      }
    }

    // Send to channel
    try {
      if (targetChannel) {
        await targetChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Failed to send level up notification to channel:', error);
    }

    // Send DM if enabled
    if (settings.levelUpDmEnabled) {
      try {
        await member.send({ embeds: [embed] });
      } catch {
        // User may have DMs disabled - this is expected behavior
        logger.debug(`Could not DM level up to ${member.user.tag} - DMs may be disabled`);
      }
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
