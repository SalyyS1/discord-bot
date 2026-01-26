import Redis from 'ioredis';
import { ConfigPublisher } from '@repo/config';

// Singleton Redis instance for publishing
let redis: Redis | null = null;
let publisher: ConfigPublisher | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redis;
}

/**
 * Get the config publisher instance
 */
export function getPublisher(): ConfigPublisher {
  if (!publisher) {
    publisher = new ConfigPublisher(getRedis());
  }
  return publisher;
}

/**
 * Publish a welcome config update
 */
export async function publishWelcomeUpdate(guildId: string): Promise<void> {
  await getPublisher().publishWelcome(guildId);
}

/**
 * Publish a moderation config update
 */
export async function publishModerationUpdate(guildId: string): Promise<void> {
  await getPublisher().publishModeration(guildId);
}

/**
 * Publish a leveling config update
 */
export async function publishLevelingUpdate(guildId: string): Promise<void> {
  await getPublisher().publishLeveling(guildId);
}

/**
 * Publish an autoresponder update
 */
export async function publishAutoResponderUpdate(
  guildId: string,
  action: 'update' | 'delete' | 'create' = 'update'
): Promise<void> {
  await getPublisher().publishAutoResponder(guildId, action);
}

/**
 * Publish a temp voice config update
 */
export async function publishTempVoiceUpdate(
  guildId: string,
  action: 'update' | 'delete' = 'update'
): Promise<void> {
  await getPublisher().publishTempVoice(guildId, action);
}
