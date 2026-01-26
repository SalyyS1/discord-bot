import { Message, GuildMember, EmbedBuilder } from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';
import { ModerationService } from '../../services/moderation.js';
import { LoggingService } from '../../services/logging.js';
import { logger } from '../../utils/logger.js';

type FilterAction = 'DELETE' | 'WARN' | 'TIMEOUT' | 'BAN';

/**
 * Word filter module with wildcard support
 */
export class WordFilterModule {
  /**
   * Convert wildcard pattern to regex
   * * = any characters, ? = single character
   */
  private static wildcardToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }

  /**
   * Check message for filtered words
   * @returns true if message was filtered
   */
  static async check(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const member = message.member;
    if (!member || member.permissions.has('ManageMessages')) return false;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    });

    if (!settings?.wordFilterEnabled || !settings.filteredWords?.length) return false;

    // Check whitelist channels
    if (settings.wordFilterWhitelist?.includes(message.channel.id)) return false;

    const content = message.content.toLowerCase();
    
    // Find matching word
    const matchedWord = settings.filteredWords.find(word => {
      try {
        const regex = this.wildcardToRegex(word);
        return regex.test(content);
      } catch {
        // Invalid pattern - fallback to simple includes
        return content.includes(word.toLowerCase());
      }
    });

    if (!matchedWord) return false;

    // Take action
    await this.handleViolation(
      message, 
      member, 
      matchedWord, 
      (settings.wordFilterAction as FilterAction) || 'DELETE'
    );
    return true;
  }

  /**
   * Handle word filter violation
   */
  private static async handleViolation(
    message: Message,
    member: GuildMember,
    word: string,
    action: FilterAction
  ): Promise<void> {
    const botMember = message.guild!.members.me;
    if (!botMember) return;

    // Delete message first
    try {
      await message.delete();
    } catch (error) {
      logger.error('Failed to delete filtered message:', error);
    }

    // Take additional action based on setting
    switch (action) {
      case 'WARN':
        try {
          await ModerationService.warn(member, botMember, 'Word filter violation', 1);
        } catch (error) {
          logger.error('Failed to warn for word filter:', error);
        }
        break;

      case 'TIMEOUT':
        try {
          await ModerationService.timeout(
            member, 
            botMember, 
            5 * 60 * 1000, // 5 minutes
            'Word filter violation'
          );
        } catch (error) {
          logger.error('Failed to timeout for word filter:', error);
        }
        break;

      case 'BAN':
        // Auto-ban is dangerous - just log for now
        logger.warn(`Word filter BAN action triggered for ${member.user.tag} - requires manual review`);
        break;

      case 'DELETE':
      default:
        // Message already deleted
        break;
    }

    // Log violation
    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🚫 Word Filter')
      .addFields(
        { name: 'User', value: member.user.tag, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Action', value: action, inline: true }
      )
      .setDescription(`Message contained filtered content`)
      .setTimestamp();

    await LoggingService.sendModLog(message.guild!, embed);
  }

  /**
   * Add word to filter list
   */
  static async addWord(guildId: string, guildName: string, word: string): Promise<boolean> {
    await ensureGuild(guildId, guildName);

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    const words = new Set(settings?.filteredWords || []);
    const normalizedWord = word.toLowerCase().trim();
    
    if (words.has(normalizedWord)) return false;

    words.add(normalizedWord);

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, filteredWords: Array.from(words), wordFilterEnabled: true },
      update: { filteredWords: Array.from(words) },
    });

    return true;
  }

  /**
   * Remove word from filter list
   */
  static async removeWord(guildId: string, word: string): Promise<boolean> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    const words = new Set(settings?.filteredWords || []);
    const normalizedWord = word.toLowerCase().trim();
    
    if (!words.has(normalizedWord)) return false;

    words.delete(normalizedWord);

    await prisma.guildSettings.update({
      where: { guildId },
      data: { filteredWords: Array.from(words) },
    });

    return true;
  }

  /**
   * Get filtered words list
   */
  static async getWords(guildId: string): Promise<string[]> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });
    return settings?.filteredWords || [];
  }

  /**
   * Set filter action
   */
  static async setAction(guildId: string, guildName: string, action: FilterAction): Promise<void> {
    await ensureGuild(guildId, guildName);

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, wordFilterAction: action },
      update: { wordFilterAction: action },
    });
  }

  /**
   * Toggle word filter
   */
  static async setEnabled(guildId: string, guildName: string, enabled: boolean): Promise<void> {
    await ensureGuild(guildId, guildName);

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, wordFilterEnabled: enabled },
      update: { wordFilterEnabled: enabled },
    });
  }
}
