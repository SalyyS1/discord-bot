import { Guild, EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export class LoggingService {
  // Get log channel for a guild
  static async getLogChannel(guild: Guild): Promise<TextChannel | null> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings?.logChannelId) return null;

    try {
      const channel = await guild.channels.fetch(settings.logChannelId);
      return channel?.isTextBased() ? (channel as TextChannel) : null;
    } catch {
      return null;
    }
  }

  // Get modlog channel for a guild
  static async getModLogChannel(guild: Guild): Promise<TextChannel | null> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings?.modLogChannelId) return null;

    try {
      const channel = await guild.channels.fetch(settings.modLogChannelId);
      return channel?.isTextBased() ? (channel as TextChannel) : null;
    } catch {
      return null;
    }
  }

  // Send to general log channel
  static async sendLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
    try {
      const channel = await this.getLogChannel(guild);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Failed to send log:', error);
    }
  }

  // Send to moderation log channel
  static async sendModLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
    try {
      const channel = await this.getModLogChannel(guild);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Failed to send modlog:', error);
    }
  }
}
