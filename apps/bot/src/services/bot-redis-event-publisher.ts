import { randomUUID } from 'crypto';
import { redis } from '../lib/redis.js';
import { logger } from '../utils/logger.js';
import type { AnySyncEvent } from '@repo/types';

const CHANNEL = 'discord_events';

/**
 * Redis Publisher Service for Bot → Dashboard events
 */
class RedisPublisherService {
  /**
   * Publish event to dashboard
   */
  async publish(event: Omit<AnySyncEvent, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      const fullEvent: AnySyncEvent = {
        ...event,
        id: randomUUID(),
        timestamp: Date.now(),
      };

      const published = await redis.publish(CHANNEL, JSON.stringify(fullEvent));

      if (published > 0) {
        logger.debug(`[RedisPublisher] Published ${event.type} event for guild ${event.guildId}`);
        return true;
      }

      logger.warn(`[RedisPublisher] No subscribers for ${event.type}`);
      return false;
    } catch (error) {
      logger.error(`[RedisPublisher] Failed to publish event:`, error);
      return false;
    }
  }

  /**
   * Publish member join event
   */
  async publishMemberJoin(
    guildId: string,
    userId: string,
    username: string,
    avatar?: string
  ): Promise<boolean> {
    return this.publish({
      type: 'MEMBER_JOIN',
      guildId,
      userId,
      data: {
        userId,
        username,
        avatar,
        joinedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Publish member leave event
   */
  async publishMemberLeave(
    guildId: string,
    userId: string,
    username: string
  ): Promise<boolean> {
    return this.publish({
      type: 'MEMBER_LEAVE',
      guildId,
      userId,
      data: {
        userId,
        username,
      },
    });
  }

  /**
   * Publish ticket create event
   */
  async publishTicketCreate(
    guildId: string,
    ticketId: string,
    channelId: string,
    userId: string,
    username: string,
    category?: string
  ): Promise<boolean> {
    return this.publish({
      type: 'TICKET_CREATE',
      guildId,
      userId,
      data: {
        ticketId,
        channelId,
        userId,
        username,
        category,
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Publish ticket claim event
   */
  async publishTicketClaim(
    guildId: string,
    ticketId: string,
    channelId: string,
    claimedBy: string,
    claimerName: string
  ): Promise<boolean> {
    return this.publish({
      type: 'TICKET_CLAIM',
      guildId,
      userId: claimedBy,
      data: {
        ticketId,
        channelId,
        claimedBy,
        claimerName,
      },
    });
  }

  /**
   * Publish ticket close event
   */
  async publishTicketClose(
    guildId: string,
    ticketId: string,
    channelId: string,
    closedBy: string,
    reason?: string
  ): Promise<boolean> {
    return this.publish({
      type: 'TICKET_CLOSE',
      guildId,
      userId: closedBy,
      data: {
        ticketId,
        channelId,
        closedBy,
        reason,
      },
    });
  }

  /**
   * Publish XP gain event
   */
  async publishXpGain(
    guildId: string,
    userId: string,
    username: string,
    xpGained: number,
    totalXp: number
  ): Promise<boolean> {
    return this.publish({
      type: 'XP_GAIN',
      guildId,
      userId,
      data: {
        userId,
        username,
        xpGained,
        totalXp,
      },
    });
  }

  /**
   * Publish level up event
   */
  async publishLevelUp(
    guildId: string,
    userId: string,
    username: string,
    level: number,
    totalXp: number
  ): Promise<boolean> {
    return this.publish({
      type: 'LEVEL_UP',
      guildId,
      userId,
      data: {
        userId,
        username,
        level,
        totalXp,
      },
    });
  }

  /**
   * Publish moderation action event
   */
  async publishModAction(
    guildId: string,
    action: 'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'UNBAN',
    targetId: string,
    targetName: string,
    moderatorId: string,
    moderatorName: string,
    reason?: string,
    duration?: number
  ): Promise<boolean> {
    return this.publish({
      type: 'MOD_ACTION',
      guildId,
      userId: moderatorId,
      data: {
        action,
        targetId,
        targetName,
        moderatorId,
        moderatorName,
        reason,
        duration,
      },
    });
  }

  /**
   * Publish giveaway start event
   */
  async publishGiveawayStart(
    guildId: string,
    giveawayId: string,
    prize: string,
    endTime: string,
    winners: number,
    hostId: string
  ): Promise<boolean> {
    return this.publish({
      type: 'GIVEAWAY_START',
      guildId,
      userId: hostId,
      data: {
        giveawayId,
        prize,
        endTime,
        winners,
        hostId,
      },
    });
  }

  /**
   * Publish settings update event
   */
  async publishSettingsUpdate(
    guildId: string,
    module: string,
    settings: Record<string, unknown>
  ): Promise<boolean> {
    return this.publish({
      type: 'SETTINGS_UPDATE',
      guildId,
      data: {
        module,
        settings,
      },
    });
  }
}

export const redisPublisher = new RedisPublisherService();
