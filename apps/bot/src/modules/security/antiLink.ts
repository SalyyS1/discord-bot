import { Message, EmbedBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';
import { LoggingService } from '../../services/logging.js';
import { logger } from '../../utils/logger.js';

// Comprehensive URL regex
const LINK_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

// Discord invite regex
const INVITE_REGEX =
  /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;

/**
 * Anti-link protection module
 */
export class AntiLinkModule {
  /**
   * Check message for unauthorized links
   * @returns true if message was blocked
   */
  static async check(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    });

    if (!settings?.antiLinkEnabled) return false;

    // Check if member has bypass permission
    const member = message.member;
    if (!member) return false;
    if (member.permissions.has('ManageMessages')) return false;

    // Check for links
    const hasLink = LINK_REGEX.test(message.content);
    const hasInvite = INVITE_REGEX.test(message.content);

    // Reset regex lastIndex for subsequent calls
    LINK_REGEX.lastIndex = 0;
    INVITE_REGEX.lastIndex = 0;

    if (!hasLink && !hasInvite) return false;

    // Check whitelist
    const whitelist = new Set(
      (settings.antiLinkWhitelist || []).map((d) => d.toLowerCase())
    );
    const links = message.content.match(LINK_REGEX) || [];

    // If all links are whitelisted, allow the message
    let allWhitelisted = true;
    for (const link of links) {
      try {
        const url = new URL(link);
        const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
        if (!whitelist.has(hostname) && !whitelist.has(url.hostname.toLowerCase())) {
          allWhitelisted = false;
          break;
        }
      } catch {
        // Invalid URL, treat as not whitelisted
        allWhitelisted = false;
        break;
      }
    }

    if (allWhitelisted && links.length > 0) return false;

    // Delete message
    try {
      await message.delete();
    } catch (error) {
      logger.error('Failed to delete message with link:', error);
    }

    // Warn user (delete warning after 5 seconds)
    try {
      if ('send' in message.channel) {
        const warning = await message.channel.send({
          content: `<@${message.author.id}> Links are not allowed in this server.`,
        });
        setTimeout(() => warning.delete().catch(() => {}), 5000);
      }
    } catch {
      // Couldn't send warning
    }

    // Log
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🔗 Link Detected')
      .addFields(
        { name: 'User', value: message.author.tag, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        {
          name: 'Content',
          value: message.content.slice(0, 1000) || 'No content',
        }
      )
      .setTimestamp();

    await LoggingService.sendModLog(message.guild, embed);

    return true;
  }

  /**
   * Add domain to whitelist
   */
  static async addToWhitelist(guildId: string, guildName: string, domain: string): Promise<void> {
    // Ensure guild exists first to prevent FK constraint violation
    await ensureGuild(guildId, guildName);

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    const whitelist = new Set(settings?.antiLinkWhitelist || []);
    whitelist.add(domain.toLowerCase().replace(/^www\./, ''));

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, antiLinkWhitelist: Array.from(whitelist) },
      update: { antiLinkWhitelist: Array.from(whitelist) },
    });
  }

  /**
   * Remove domain from whitelist
   */
  static async removeFromWhitelist(
    guildId: string,
    domain: string
  ): Promise<boolean> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    const whitelist = new Set(settings?.antiLinkWhitelist || []);
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    if (!whitelist.has(normalizedDomain)) return false;

    whitelist.delete(normalizedDomain);

    await prisma.guildSettings.update({
      where: { guildId },
      data: { antiLinkWhitelist: Array.from(whitelist) },
    });

    return true;
  }

  /**
   * Get whitelist for a guild
   */
  static async getWhitelist(guildId: string): Promise<string[]> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });
    return settings?.antiLinkWhitelist || [];
  }

  /**
   * Toggle anti-link protection
   */
  static async setEnabled(guildId: string, guildName: string, enabled: boolean): Promise<void> {
    // Ensure guild exists first to prevent FK constraint violation
    await ensureGuild(guildId, guildName);

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, antiLinkEnabled: enabled },
      update: { antiLinkEnabled: enabled },
    });
  }
}
