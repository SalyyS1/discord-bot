import { Worker, Job, ConnectionOptions } from 'bullmq';
import { redis } from '../../lib/redis.js';
import { GiveawayModule } from './index.js';
import { logger } from '../../utils/logger.js';

/**
 * Initialize giveaway end worker
 */
export function initializeGiveawayWorker(): void {
  const worker = new Worker(
    'giveaway-end',
    async (job: Job) => {
      const { giveawayId } = job.data;
      logger.info(`Processing giveaway end: ${giveawayId}`);

      await GiveawayModule.end(giveawayId);
    },
    {
      // Cast to any to work around ioredis version mismatch
      connection: redis as unknown as ConnectionOptions,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`Giveaway job completed: ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`Giveaway job failed: ${job?.id}`, error);
  });

  logger.info('Giveaway worker initialized');
}
