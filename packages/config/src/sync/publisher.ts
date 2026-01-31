import type Redis from 'ioredis';
import { CONFIG_CHANNELS, createConfigMessage, type ConfigUpdateMessage } from './channels';

/**
 * Config publisher for dashboard to notify bot of changes
 */
export class ConfigPublisher {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Publish a config update message
   */
  async publish(
    guildId: string,
    module: keyof typeof CONFIG_CHANNELS,
    action: 'update' | 'delete' | 'create' = 'update',
    data?: Record<string, unknown>
  ): Promise<void> {
    const message = createConfigMessage(guildId, module, action, data);
    const channel = CONFIG_CHANNELS[module];

    await this.redis.publish(channel, JSON.stringify(message));

    // Also publish to the main update channel
    await this.redis.publish(CONFIG_CHANNELS.CONFIG_UPDATE, JSON.stringify(message));
  }

  /**
   * Publish welcome config update
   */
  async publishWelcome(guildId: string, data?: Record<string, unknown>): Promise<void> {
    await this.publish(guildId, 'WELCOME', 'update', data);
  }

  /**
   * Publish general settings update
   */
  async publishSettings(guildId: string, data?: Record<string, unknown>): Promise<void> {
    await this.publish(guildId, 'SETTINGS', 'update', data);
  }

  /**
   * Publish moderation config update
   */
  async publishModeration(guildId: string, data?: Record<string, unknown>): Promise<void> {
    await this.publish(guildId, 'MODERATION', 'update', data);
  }

  /**
   * Publish leveling config update
   */
  async publishLeveling(guildId: string, data?: Record<string, unknown>): Promise<void> {
    await this.publish(guildId, 'LEVELING', 'update', data);
  }

  /**
   * Publish autoresponder update
   */
  async publishAutoResponder(
    guildId: string,
    action: 'update' | 'delete' | 'create',
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(guildId, 'AUTORESPONDER', action, data);
  }

  /**
   * Publish temp voice config update
   */
  async publishTempVoice(
    guildId: string,
    action: 'update' | 'delete' = 'update',
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(guildId, 'TEMPVOICE', action, data);
  }

  /**
   * Publish giveaway config update
   */
  async publishGiveaway(
    guildId: string,
    action: 'update' | 'delete' | 'create' = 'update',
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(guildId, 'GIVEAWAY', action, data);
  }

  /**
   * Publish tickets config update
   */
  async publishTickets(
    guildId: string,
    action: 'update' | 'delete' | 'create' = 'update',
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(guildId, 'TICKETS', action, data);
  }

  /**
   * Publish music config update
   */
  async publishMusic(
    guildId: string,
    action: 'update' | 'delete' = 'update',
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(guildId, 'MUSIC', action, data);
  }
}
