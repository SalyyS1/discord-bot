import type Redis from 'ioredis';
import { redis as mainRedis } from '../redis';
import { logger } from '../logger';
import type { AnySyncEvent } from '@repo/types';

const CHANNEL = 'discord_events';

let subscriber: Redis | null = null;

/**
 * Event handler callback
 */
type EventHandler = (event: AnySyncEvent) => void | Promise<void>;
const eventHandlers = new Set<EventHandler>();

/**
 * Subscribe to bot events
 */
export async function subscribeToRedisEvents(): Promise<void> {
  if (subscriber) {
    logger.warn('Dashboard Redis subscriber already initialized');
    return;
  }

  try {
    subscriber = mainRedis.duplicate();

    subscriber.on('message', async (channel, message) => {
      if (channel === CHANNEL) {
        try {
          const event = JSON.parse(message) as AnySyncEvent;

          // Call all registered handlers
          for (const handler of eventHandlers) {
            try {
              await handler(event);
            } catch (error) {
              logger.error(`Dashboard event handler error:`, { error: String(error) });
            }
          }
        } catch (error) {
          logger.error('Failed to parse bot event:', { error: String(error) });
        }
      }
    });

    await subscriber.subscribe(CHANNEL);
    logger.info('Dashboard subscribed to bot events');
  } catch (error) {
    logger.error('Failed to subscribe to bot events:', { error: String(error) });
  }
}

/**
 * Register event handler
 */
export function onBotEvent(handler: EventHandler): () => void {
  eventHandlers.add(handler);

  // Return unsubscribe function
  return () => {
    eventHandlers.delete(handler);
  };
}

/**
 * Unsubscribe from bot events
 */
export async function unsubscribeFromRedisEvents(): Promise<void> {
  if (subscriber) {
    await subscriber.unsubscribe(CHANNEL);
    subscriber.disconnect();
    subscriber = null;
    eventHandlers.clear();
    logger.info('Dashboard unsubscribed from bot events');
  }
}
