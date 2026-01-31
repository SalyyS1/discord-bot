/**
 * Shard Utilities
 * Cross-shard communication and utilities for sharded bot deployment
 */

import { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

/**
 * Broadcast an evaluation function to all shards
 * Falls back to single execution if not sharded
 */
export async function broadcastEval<T>(
  client: Client,
  fn: (c: Client) => T | Promise<T>
): Promise<T[]> {
  if (!client.shard) {
    // Single process mode - execute directly
    return [await fn(client)];
  }

  // Cast to string for shard.broadcastEval
  return client.shard.broadcastEval(fn) as Promise<T[]>;
}

/**
 * Get the shard ID that a guild would be on
 */
export function getShardIdForGuild(guildId: string, totalShards: number): number {
  return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}

/**
 * Get total guild count across all shards
 */
export async function getTotalGuildCount(client: Client): Promise<number> {
  const results = await broadcastEval(client, (c) => c.guilds.cache.size);
  return results.reduce((a, b) => a + b, 0);
}

/**
 * Get total user count across all shards (unique)
 */
export async function getTotalUserCount(client: Client): Promise<number> {
  const results = await broadcastEval(client, (c) =>
    c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
  );
  return results.reduce((a, b) => a + b, 0);
}

/**
 * Get shard info for current process
 */
export function getShardInfo(client: Client): {
  shardId: number;
  totalShards: number;
  isSharded: boolean;
} {
  return {
    shardId: client.shard?.ids[0] ?? 0,
    totalShards: client.shard?.count ?? 1,
    isSharded: !!client.shard,
  };
}

/**
 * Check if current shard handles a specific guild
 */
export function isGuildOnCurrentShard(client: Client, guildId: string): boolean {
  if (!client.shard) return true; // Single process handles all

  const shardId = getShardIdForGuild(guildId, client.shard.count);
  return client.shard.ids.includes(shardId);
}

/**
 * Get memory usage across all shards
 */
export async function getClusterMemoryUsage(client: Client): Promise<{
  total: number;
  shards: Array<{ shardId: number; memory: number }>;
}> {
  const results = await broadcastEval(client, (c) => ({
    shardId: c.shard?.ids[0] ?? 0,
    memory: process.memoryUsage().heapUsed,
  }));

  return {
    total: results.reduce((sum, s) => sum + s.memory, 0),
    shards: results,
  };
}

/**
 * Graceful shutdown handler for sharded bot
 */
export async function gracefulShutdown(client: Client, reason: string): Promise<void> {
  logger.info(`Shard ${getShardInfo(client).shardId} shutting down: ${reason}`);

  // Destroy the client connection
  client.destroy();

  // Allow time for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));

  process.exit(0);
}
