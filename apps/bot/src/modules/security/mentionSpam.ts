import { Message, GuildMember, EmbedBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { ModerationService } from '../../services/moderation.js';
import { LoggingService } from '../../services/logging.js';
import { logger } from '../../utils/logger.js';

/**
 * Mention spam detection module
 */
export class MentionSpamModule {
  /**
   * Check message for mention spam
   * @returns true if message was flagged as spam
   */
  static async check(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const member = message.member;
    if (!member || member.permissions.has('ManageMessages')) return false;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    });

    if (!settings?.mentionSpamEnabled) return false;

    const threshold = settings.mentionSpamThreshold || 5;

    // Count all mentions
    const mentionCount = 
      message.mentions.users.size + 
      message.mentions.roles.size +
      (message.mentions.everyone ? 10 : 0); // @everyone counts as 10

    if (mentionCount < threshold) return false;

    // Handle violation
    await this.handleViolation(message, member, mentionCount, threshold);
    return true;
  }

  /**
   * Handle mention spam violation
   */
  private static async handleViolation(
    message: Message,
    member: GuildMember,
    mentionCount: number,
    threshold: number
  ): Promise<void> {
    const botMember = message.guild!.members.me;
    if (!botMember) return;

    // Delete message
    try {
      await message.delete();
    } catch (error) {
      logger.error('Failed to delete mention spam message:', error);
    }

    // Timeout the user
    try {
      await ModerationService.timeout(
        member,
        botMember,
        5 * 60 * 1000, // 5 minutes
        `Mention spam: ${mentionCount} mentions (threshold: ${threshold})`
      );
    } catch (error) {
      logger.error('Failed to timeout for mention spam:', error);
    }

    // Log violation
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('📢 Mention Spam Detected')
      .addFields(
        { name: 'User', value: member.user.tag, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Mentions', value: `${mentionCount}/${threshold}`, inline: true },
        { name: 'Action', value: '⏱️ 5 minute timeout', inline: false }
      )
      .setTimestamp();

    await LoggingService.sendModLog(message.guild!, embed);

    logger.info(`Mention spam detected: ${member.user.tag} with ${mentionCount} mentions`);
  }

  /**
   * Set mention spam threshold
   */
  static async setThreshold(guildId: string, guildName: string, threshold: number): Promise<void> {
    const { ensureGuild } = await import('../../lib/settings.js');
    await ensureGuild(guildId, guildName);

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, mentionSpamThreshold: threshold, mentionSpamEnabled: true },
      update: { mentionSpamThreshold: threshold },
    });
  }

  /**
   * Toggle mention spam detection
   */
  static async setEnabled(guildId: string, guildName: string, enabled: boolean): Promise<void> {
    const { ensureGuild } = await import('../../lib/settings.js');
    await ensureGuild(guildId, guildName);

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, mentionSpamEnabled: enabled },
      update: { mentionSpamEnabled: enabled },
    });
  }
}
