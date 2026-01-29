import { randomUUID } from 'crypto';
import { redis } from '../redis';
import { logger } from '../logger';

const CHANNEL = 'bot_commands';

/**
 * Publish command to bot
 */
export async function publishCommandToBot(
  type: string,
  guildId: string,
  data: Record<string, unknown>,
  userId?: string
): Promise<boolean> {
  try {
    const command = {
      type,
      guildId,
      userId,
      data,
      timestamp: Date.now(),
      id: randomUUID(),
    };

    const result = await redis.publish(CHANNEL, JSON.stringify(command));

    if (result > 0) {
      logger.info(`Published command ${type} to bot for guild ${guildId}`);
      return true;
    }

    logger.warn(`No bot subscribers for command ${type}`);
    return false;
  } catch (error) {
    logger.error(`Failed to publish command to bot:`, { error: String(error) });
    return false;
  }
}

/**
 * Publish kick member command
 */
export async function publishKickMemberCommand(
  guildId: string,
  targetId: string,
  reason?: string
): Promise<boolean> {
  return publishCommandToBot('KICK_MEMBER', guildId, { targetId, reason });
}

/**
 * Publish ban member command
 */
export async function publishBanMemberCommand(
  guildId: string,
  targetId: string,
  reason?: string,
  deleteMessageDays?: number
): Promise<boolean> {
  return publishCommandToBot('BAN_MEMBER', guildId, {
    targetId,
    reason,
    deleteMessageDays,
  });
}

/**
 * Publish timeout member command
 */
export async function publishTimeoutMemberCommand(
  guildId: string,
  targetId: string,
  duration: number,
  reason?: string
): Promise<boolean> {
  return publishCommandToBot('TIMEOUT_MEMBER', guildId, {
    targetId,
    duration,
    reason,
  });
}

/**
 * Publish send message command
 */
export async function publishSendMessageCommand(
  guildId: string,
  channelId: string,
  content: string,
  embed?: Record<string, unknown>
): Promise<boolean> {
  return publishCommandToBot('SEND_MESSAGE', guildId, {
    channelId,
    content,
    embed,
  });
}

/**
 * Publish update settings command
 */
export async function publishUpdateSettingsCommand(
  guildId: string,
  module: string,
  settings: Record<string, unknown>
): Promise<boolean> {
  return publishCommandToBot('UPDATE_SETTINGS', guildId, {
    module,
    settings,
  });
}
