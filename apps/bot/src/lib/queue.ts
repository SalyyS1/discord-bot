import { Queue, ConnectionOptions } from 'bullmq';
import { redis } from './redis.js';
import { logger } from '../utils/logger.js';

/**
 * Giveaway end queue
 * Handles scheduling giveaway end times
 */
export const giveawayQueue = new Queue('giveaway-end', {
  // Cast to any to work around ioredis version mismatch
  connection: redis as unknown as ConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Initialize queue workers
 */
export function initializeQueues(): void {
  logger.info('Queue system initialized');
}
