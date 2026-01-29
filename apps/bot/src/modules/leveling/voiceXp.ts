import { VoiceState } from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { client } from '../../lib/client.js';
import { getLevelFromXp } from './xpCalculator.js';
import { logger } from '../../utils/logger.js';
import { TTLMap } from '../../lib/ttl-map-with-auto-cleanup.js';

// Track active voice sessions in memory with TTL to prevent memory leaks
const voiceSessionMap = new TTLMap<string, { guildId: string; startTime: number; channelId: string }>({
  defaultTtlMs: 24 * 60 * 60 * 1000, // 24 hours max
  cleanupIntervalMs: 30 * 60 * 1000, // Cleanup every 30 minutes
});

/**
 * Voice XP module - Awards XP for time spent in voice channels
 */
export class VoiceXpModule {
  /**
   * Handle voice state update events
   */
  static async handleVoiceUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const guildId = newState.guild.id;
      const userId = member.id;
      const key = `${guildId}:${userId}`;

      // User joined a voice channel (wasn't in one before)
      if (!oldState.channelId && newState.channelId) {
        await this.startSession(key, guildId, newState.channelId);
        return;
      }

      // User left voice (was in a channel, now not)
      if (oldState.channelId && !newState.channelId) {
        await this.endSession(key, userId, guildId);
        return;
      }

      // User moved between channels (session continues, no XP calculation needed)
      // We just update the channel ID in case we want to track it later
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const session = voiceSessionMap.get(key);
        if (session) {
          session.channelId = newState.channelId;
        }
      }
    } catch (error) {
      logger.error('VoiceXpModule.handleVoiceUpdate error:', error);
    }
  }

  /**
   * Start tracking a voice session
   */
  private static async startSession(key: string, guildId: string, channelId: string): Promise<void> {
    voiceSessionMap.set(key, {
      guildId,
      startTime: Date.now(),
      channelId,
    });
    logger.debug(`Voice session started: ${key}`);
  }

  /**
   * End a voice session and award XP
   */
  private static async endSession(key: string, userId: string, guildId: string): Promise<void> {
    const session = voiceSessionMap.get(key);
    if (!session) return;

    voiceSessionMap.delete(key);

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    // Check if voice XP is enabled
    if (!settings?.voiceXpEnabled || !settings?.levelingEnabled) {
      logger.debug(`Voice XP disabled for guild ${guildId}`);
      return;
    }

    // Calculate minutes in voice
    const minutes = Math.floor((Date.now() - session.startTime) / 60000);
    if (minutes < 1) {
      logger.debug(`Voice session too short for XP: ${minutes} min`);
      return;
    }

    // Check cooldown
    const cooldownKey = `voice:cooldown:${guildId}:${userId}`;
    const cooldownSeconds = settings.voiceXpCooldown || 60;

    try {
      const onCooldown = await redis.exists(cooldownKey);
      if (onCooldown) {
        logger.debug(`Voice XP on cooldown for ${userId}`);
        return;
      }
      await redis.setex(cooldownKey, cooldownSeconds, '1');
    } catch {
      // Redis unavailable - check DB fallback
      const member = await prisma.member.findUnique({
        where: { discordId_guildId: { discordId: userId, guildId } },
        select: { lastVoiceXpGain: true },
      });

      if (member?.lastVoiceXpGain) {
        const timeSince = Date.now() - member.lastVoiceXpGain.getTime();
        if (timeSince < cooldownSeconds * 1000) {
          return;
        }
      }
    }

    // Calculate XP
    const xpPerMinute = settings.voiceXpPerMinute || 6;
    let xpGain = minutes * xpPerMinute;

    // Apply multiplier
    const multiplier = await this.getMultiplier(userId, guildId, settings.xpMultipliers);
    xpGain = Math.floor(xpGain * multiplier);

    // Get current member data
    const memberData = await prisma.member.findUnique({
      where: { discordId_guildId: { discordId: userId, guildId } },
    });

    const currentXp = memberData?.xp || 0;
    const oldLevel = memberData?.level || 0;
    const newXp = currentXp + xpGain;
    const newLevel = getLevelFromXp(newXp);

    // Update member
    await prisma.member.upsert({
      where: { discordId_guildId: { discordId: userId, guildId } },
      create: {
        discordId: userId,
        guildId,
        xp: xpGain,
        level: getLevelFromXp(xpGain),
        voiceMinutes: minutes,
        lastVoiceXpGain: new Date(),
      },
      update: {
        xp: newXp,
        level: newLevel,
        voiceMinutes: { increment: minutes },
        lastVoiceXpGain: new Date(),
      },
    });

    // Invalidate leaderboard cache
    try {
      await redis.del(`leaderboard:${guildId}`);
    } catch {
      // Non-critical
    }

    logger.info(`Voice XP: ${userId} gained ${xpGain} XP (${minutes} min, ${multiplier}x)`);

    // Check for level up (we don't send notification for voice XP to avoid spam)
    if (newLevel > oldLevel) {
      logger.info(`Voice level up: ${userId} reached level ${newLevel}`);
      // Note: Level roles will be assigned on next message or rank check
    }
  }

  /**
   * Get XP multiplier for a member based on their roles
   */
  private static async getMultiplier(
    userId: string,
    guildId: string,
    multipliers: unknown
  ): Promise<number> {
    if (!multipliers || typeof multipliers !== 'object') return 1;

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return 1;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return 1;

      let maxMultiplier = 1;
      const mults = multipliers as Record<string, number>;

      for (const [roleId, mult] of Object.entries(mults)) {
        if (member.roles.cache.has(roleId) && typeof mult === 'number') {
          maxMultiplier = Math.max(maxMultiplier, mult);
        }
      }

      return maxMultiplier;
    } catch (error) {
      logger.error('Error getting multiplier:', error);
      return 1;
    }
  }

  /**
   * Get active voice session for a user (for debugging/status)
   */
  static getActiveSession(guildId: string, userId: string): { minutes: number } | null {
    const key = `${guildId}:${userId}`;
    const session = voiceSessionMap.get(key);
    if (!session) return null;

    const minutes = Math.floor((Date.now() - session.startTime) / 60000);
    return { minutes };
  }
}
