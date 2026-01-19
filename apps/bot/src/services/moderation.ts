import { GuildMember, Guild, PermissionFlagsBits } from 'discord.js';
import { prisma, ModAction, Prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

interface ModActionResult {
  success: boolean;
  error?: string;
}

export class ModerationService {
  // Check if bot can moderate target
  static canModerate(moderator: GuildMember, target: GuildMember): boolean {
    const botMember = target.guild.members.me;
    if (!botMember) return false;

    // Bot role must be higher
    if (botMember.roles.highest.position <= target.roles.highest.position) {
      return false;
    }

    // Moderator role must be higher (unless admin)
    if (!moderator.permissions.has(PermissionFlagsBits.Administrator)) {
      if (moderator.roles.highest.position <= target.roles.highest.position) {
        return false;
      }
    }

    return true;
  }

  // Timeout member
  static async timeout(
    target: GuildMember,
    moderator: GuildMember,
    duration: number, // milliseconds
    reason?: string
  ): Promise<ModActionResult> {
    try {
      await target.timeout(duration, reason);
      await this.logAction(
        target.guild.id,
        ModAction.TIMEOUT,
        target.id,
        moderator.id,
        reason,
        Math.floor(duration / 1000)
      );
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Timeout failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  // Kick member
  static async kick(
    target: GuildMember,
    moderator: GuildMember,
    reason?: string
  ): Promise<ModActionResult> {
    try {
      await target.kick(reason);
      await this.logAction(
        target.guild.id,
        ModAction.KICK,
        target.id,
        moderator.id,
        reason
      );
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Kick failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  // Ban member
  static async ban(
    guild: Guild,
    targetId: string,
    moderator: GuildMember,
    reason?: string,
    deleteMessageSeconds: number = 0
  ): Promise<ModActionResult> {
    try {
      await guild.members.ban(targetId, { reason, deleteMessageSeconds });
      await this.logAction(guild.id, ModAction.BAN, targetId, moderator.id, reason);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Ban failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  // Unban user
  static async unban(
    guild: Guild,
    userId: string,
    moderator: GuildMember,
    reason?: string
  ): Promise<ModActionResult> {
    try {
      await guild.members.unban(userId, reason);
      await this.logAction(guild.id, ModAction.UNBAN, userId, moderator.id, reason);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Unban failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  // Warn member with auto-escalation
  static async warn(
    target: GuildMember,
    moderator: GuildMember,
    reason: string,
    severity: number = 1
  ): Promise<{ success: boolean; warningCount: number; action?: string }> {
    try {
      // Get or create member record
      const member = await prisma.member.upsert({
        where: {
          discordId_guildId: {
            discordId: target.id,
            guildId: target.guild.id,
          },
        },
        create: {
          discordId: target.id,
          guildId: target.guild.id,
        },
        update: {},
      });

      // Create warning
      await prisma.warning.create({
        data: {
          memberId: member.id,
          guildId: target.guild.id,
          moderatorId: moderator.id,
          reason,
          severity,
        },
      });

      // Count active warnings
      const warningCount = await prisma.warning.count({
        where: {
          memberId: member.id,
          active: true,
        },
      });

      // Log warning action
      await this.logAction(
        target.guild.id,
        ModAction.WARN,
        target.id,
        moderator.id,
        reason,
        undefined,
        { warningCount }
      );

      // Auto-escalation
      let action: string | undefined;
      if (warningCount >= 5) {
        await this.kick(target, moderator, `Auto-kick: ${warningCount} warnings`);
        action = 'kick';
      } else if (warningCount >= 4) {
        await this.timeout(
          target,
          moderator,
          24 * 60 * 60 * 1000,
          `Auto-timeout: ${warningCount} warnings`
        );
        action = 'timeout_24h';
      } else if (warningCount >= 3) {
        await this.timeout(
          target,
          moderator,
          60 * 60 * 1000,
          `Auto-timeout: ${warningCount} warnings`
        );
        action = 'timeout_1h';
      }

      return { success: true, warningCount, action };
    } catch (error: unknown) {
      logger.error('Warn failed:', error);
      return { success: false, warningCount: 0 };
    }
  }

  // Log moderation action to database
  private static async logAction(
    guildId: string,
    action: ModAction,
    targetId: string,
    moderatorId: string,
    reason?: string,
    duration?: number,
    metadata?: Prisma.InputJsonValue
  ): Promise<void> {
    await prisma.modLog.create({
      data: {
        guildId,
        action,
        targetId,
        moderatorId,
        reason,
        duration,
        metadata,
      },
    });
  }
}
