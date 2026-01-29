import { Message, GuildMember, EmbedBuilder } from 'discord.js';
import { redis } from '../../lib/redis.js';
import { prisma } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';
import { ModerationService } from '../../services/moderation.js';
import { LoggingService } from '../../services/logging.js';
import { logger } from '../../utils/logger.js';
import { TTLMap } from '../../lib/ttl-map-with-auto-cleanup.js';

interface SpamConfig {
  maxMessages: number; // Messages per interval
  intervalSeconds: number; // Time window
  duplicateThreshold: number; // Max duplicate messages
  warnThreshold: number; // Violations before warn
  muteThreshold: number; // Violations before mute
}

const DEFAULT_CONFIG: SpamConfig = {
  maxMessages: 5,
  intervalSeconds: 5,
  duplicateThreshold: 3,
  warnThreshold: 3,
  muteThreshold: 5,
};

// Memory fallback for rate limiting when Redis unavailable
// Using TTLMap to prevent unbounded memory growth
const memoryRateLimit = new TTLMap<string, number[]>({
  defaultTtlMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000,
});

const memoryDuplicates = new TTLMap<string, string[]>({
  defaultTtlMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000,
});

const memoryViolations = new TTLMap<string, number>({
  defaultTtlMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 5 * 60 * 1000,
});

/**
 * Anti-spam protection module using token bucket algorithm
 */
export class AntiSpamModule {
  /**
   * Check message for spam
   * @returns true if message was spam
   */
  static async check(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    });

    if (!settings?.antiSpamEnabled) return false;

    // Check if member has bypass permission
    const member = message.member;
    if (!member) return false;
    if (member.permissions.has('ManageMessages')) return false;

    // Use guild-specific config or defaults
    const config: SpamConfig = {
      maxMessages: settings.antiSpamMaxMessages ?? DEFAULT_CONFIG.maxMessages,
      intervalSeconds: settings.antiSpamInterval ?? DEFAULT_CONFIG.intervalSeconds,
      duplicateThreshold: settings.antiSpamDuplicates ?? DEFAULT_CONFIG.duplicateThreshold,
      warnThreshold: settings.antiSpamWarnThreshold ?? DEFAULT_CONFIG.warnThreshold,
      muteThreshold: settings.antiSpamMuteThreshold ?? DEFAULT_CONFIG.muteThreshold,
    };
    const userId = message.author.id;
    const guildId = message.guild.id;

    // Token bucket rate limiting
    const isSpamming = await this.checkRateLimit(userId, guildId, config);

    // Duplicate message detection
    const isDuplicate = await this.checkDuplicates(message, config);

    if (!isSpamming && !isDuplicate) return false;

    // Delete spam message
    try {
      await message.delete();
    } catch (error) {
      logger.error('Failed to delete spam message:', error);
    }

    // Track violations
    const violations = await this.incrementViolations(userId, guildId);

    // Take action based on violations
    await this.handleViolation(member, violations, config);

    return true;
  }

  /**
   * Token bucket rate limiter with memory fallback
   */
  private static async checkRateLimit(
    userId: string,
    guildId: string,
    config: SpamConfig
  ): Promise<boolean> {
    const key = `spam:rate:${guildId}:${userId}`;

    try {
      const count = await redis.incr(key);

      // Set expiry on first message
      if (count === 1) {
        await redis.expire(key, config.intervalSeconds);
      }

      return count > config.maxMessages;
    } catch {
      // Fallback to memory-based rate limiting
      return this.checkRateLimitMemory(key, config);
    }
  }

  /**
   * Memory-based rate limiter fallback
   */
  private static checkRateLimitMemory(key: string, config: SpamConfig): boolean {
    const now = Date.now();
    const timestamps = memoryRateLimit.get(key) || [];
    
    // Filter to only timestamps within the interval
    const recent = timestamps.filter(t => now - t < config.intervalSeconds * 1000);
    recent.push(now);
    
    // Keep only relevant timestamps to prevent memory bloat
    memoryRateLimit.set(key, recent.slice(-config.maxMessages * 2));
    
    return recent.length > config.maxMessages;
  }

  /**
   * Check for duplicate messages with memory fallback
   */
  private static async checkDuplicates(
    message: Message,
    config: SpamConfig
  ): Promise<boolean> {
    const key = `spam:dup:${message.guild!.id}:${message.author.id}`;
    const content = message.content.toLowerCase().trim();

    if (!content || content.length < 10) return false; // Ignore short messages

    // Create hash of message content (truncated base64)
    const hash = Buffer.from(content).toString('base64').slice(0, 50);

    try {
      const multi = redis.multi();
      multi.lpush(key, hash);
      multi.ltrim(key, 0, config.duplicateThreshold);
      multi.expire(key, 60);
      multi.lrange(key, 0, -1);

      const results = await multi.exec();
      const recentMessages = (results?.[3]?.[1] as string[]) || [];

      // Check if too many duplicates
      const duplicates = recentMessages.filter((h) => h === hash).length;
      return duplicates >= config.duplicateThreshold;
    } catch {
      // Fallback to memory-based duplicate check
      return this.checkDuplicatesMemory(key, hash, config);
    }
  }

  /**
   * Memory-based duplicate check fallback
   */
  private static checkDuplicatesMemory(key: string, hash: string, config: SpamConfig): boolean {
    const hashes = memoryDuplicates.get(key) || [];
    hashes.unshift(hash);
    
    // Keep only recent messages
    const recent = hashes.slice(0, config.duplicateThreshold + 1);
    memoryDuplicates.set(key, recent);
    
    const duplicates = recent.filter(h => h === hash).length;
    return duplicates >= config.duplicateThreshold;
  }

  /**
   * Track violation count with memory fallback
   */
  private static async incrementViolations(
    userId: string,
    guildId: string
  ): Promise<number> {
    const key = `spam:violations:${guildId}:${userId}`;

    try {
      const count = await redis.incr(key);
      await redis.expire(key, 3600); // Reset after 1 hour
      return count;
    } catch {
      // Fallback to memory-based violation tracking
      const current = memoryViolations.get(key) || 0;
      const newCount = current + 1;
      memoryViolations.set(key, newCount);
      return newCount;
    }
  }

  /**
   * Handle spam violation with escalating actions
   */
  private static async handleViolation(
    member: GuildMember,
    violations: number,
    config: SpamConfig
  ): Promise<void> {
    const botMember = member.guild.members.me;
    if (!botMember) return;

    // Log violation
    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🚫 Spam Detected')
      .addFields(
        { name: 'User', value: member.user.tag, inline: true },
        { name: 'Violations', value: `${violations}`, inline: true }
      )
      .setTimestamp();

    if (violations >= config.muteThreshold) {
      // Auto-mute (timeout)
      try {
        await ModerationService.timeout(
          member,
          botMember,
          10 * 60 * 1000, // 10 minutes
          `Auto-mute: ${violations} spam violations`
        );
        embed.addFields({ name: 'Action', value: '⏱️ Muted for 10 minutes' });
      } catch (error) {
        logger.error('Failed to auto-mute spam:', error);
      }
    } else if (violations >= config.warnThreshold) {
      // Auto-warn
      try {
        await ModerationService.warn(
          member,
          botMember,
          `Auto-warn: ${violations} spam violations`,
          1
        );
        embed.addFields({ name: 'Action', value: '⚠️ Warning issued' });
      } catch (error) {
        logger.error('Failed to auto-warn spam:', error);
      }
    } else {
      embed.addFields({ name: 'Action', value: '🗑️ Message deleted' });
    }

    await LoggingService.sendModLog(member.guild, embed);
  }

  /**
   * Toggle anti-spam protection
   */
  static async setEnabled(guildId: string, guildName: string, enabled: boolean): Promise<void> {
    // Ensure guild exists first to prevent FK constraint violation
    await ensureGuild(guildId, guildName);

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: { guildId, antiSpamEnabled: enabled },
      update: { antiSpamEnabled: enabled },
    });
  }
}
