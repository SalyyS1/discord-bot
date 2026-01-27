import type Redis from 'ioredis';
import { CONFIG_CHANNELS, type ConfigUpdateMessage, type ConfigChannel } from './channels.js';

export type ConfigHandler = (message: ConfigUpdateMessage) => void | Promise<void>;

/**
 * Config subscriber for bot to receive updates from dashboard
 */
export class ConfigSubscriber {
  private handlers: Map<ConfigChannel, ConfigHandler[]> = new Map();
  private subscriberRedis: Redis;

  constructor(redis: Redis) {
    // Create a separate connection for subscriptions
    this.subscriberRedis = redis.duplicate();
  }

  /**
   * Subscribe to config updates
   */
  async subscribe(): Promise<void> {
    // Subscribe to all config channels
    const channels = Object.values(CONFIG_CHANNELS);
    await this.subscriberRedis.subscribe(...channels);

    this.subscriberRedis.on('message', (channel, message) => {
      try {
        const parsed = JSON.parse(message) as ConfigUpdateMessage;
        const handlers = this.handlers.get(channel as ConfigChannel) || [];

        for (const handler of handlers) {
          Promise.resolve(handler(parsed)).catch((err) => {
            console.error(`Error in config handler for ${channel}:`, err);
          });
        }
      } catch (err) {
        console.error('Failed to parse config message:', err);
      }
    });
  }

  /**
   * Register a handler for a specific channel
   */
  on(channel: ConfigChannel, handler: ConfigHandler): void {
    const handlers = this.handlers.get(channel) || [];
    handlers.push(handler);
    this.handlers.set(channel, handlers);
  }

  /**
   * Register a handler for all config updates
   */
  onAny(handler: ConfigHandler): void {
    this.on(CONFIG_CHANNELS.CONFIG_UPDATE, handler);
  }

  /**
   * Unsubscribe and cleanup
   */
  async disconnect(): Promise<void> {
    await this.subscriberRedis.unsubscribe();
    await this.subscriberRedis.quit();
  }
}
