/**
 * Health Check Server
 * Provides /health and /ready endpoints for container orchestration
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Client } from 'discord.js';
import { prisma } from './prisma.js';
import { redis } from './redis.js';
import { getShardInfo } from './shardUtils.js';
import { logger } from '../utils/logger.js';

interface HealthCheck {
  healthy: boolean;
  checks: {
    discord: boolean;
    database: boolean;
    redis: boolean;
  };
  uptime: number;
  memory: NodeJS.MemoryUsage;
  shard: {
    id: number;
    total: number;
  };
  guilds?: number;
  timestamp: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Perform full health check
 */
async function performHealthCheck(client: Client): Promise<HealthCheck> {
  const [dbOk, redisOk] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const shardInfo = getShardInfo(client);
  const discordOk = client.isReady();

  return {
    healthy: discordOk && dbOk && redisOk,
    checks: {
      discord: discordOk,
      database: dbOk,
      redis: redisOk,
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    shard: {
      id: shardInfo.shardId,
      total: shardInfo.totalShards,
    },
    guilds: discordOk ? client.guilds.cache.size : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Start the health check HTTP server
 */
export function startHealthServer(client: Client, port: number = 8080): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || '';

    // CORS headers for monitoring tools
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
      if (url === '/health' || url === '/healthz') {
        // Full health check
        const health = await performHealthCheck(client);
        res.writeHead(health.healthy ? 200 : 503);
        res.end(JSON.stringify(health, null, 2));
      } else if (url === '/ready') {
        // Readiness check - is the bot ready to handle requests?
        const ready = client.isReady();
        res.writeHead(ready ? 200 : 503);
        res.end(JSON.stringify({ ready }));
      } else if (url === '/live') {
        // Liveness check - is the process alive?
        res.writeHead(200);
        res.end(JSON.stringify({ alive: true, uptime: process.uptime() }));
      } else if (url === '/metrics') {
        // Prometheus-style metrics (basic)
        const shardInfo = getShardInfo(client);
        const metrics = [
          `# HELP discord_guilds Total guilds on this shard`,
          `# TYPE discord_guilds gauge`,
          `discord_guilds{shard="${shardInfo.shardId}"} ${client.guilds.cache.size}`,
          `# HELP process_uptime_seconds Process uptime`,
          `# TYPE process_uptime_seconds gauge`,
          `process_uptime_seconds ${process.uptime()}`,
          `# HELP process_memory_heap_bytes Heap memory usage`,
          `# TYPE process_memory_heap_bytes gauge`,
          `process_memory_heap_bytes ${process.memoryUsage().heapUsed}`,
          `# HELP discord_shard_status Shard connection status (1=ready, 0=not ready)`,
          `# TYPE discord_shard_status gauge`,
          `discord_shard_status{shard="${shardInfo.shardId}"} ${client.isReady() ? 1 : 0}`,
        ];
        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(200);
        res.end(metrics.join('\n') + '\n');
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      logger.error('Health check error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  // Handle server errors - including port already in use
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.warn(`Health server port ${port} already in use, trying ${port + 1}`);
      // Try next port
      if (port < 8090) {
        startHealthServer(client, port + 1);
      } else {
        logger.error('Could not find available port for health server');
      }
    } else {
      logger.error('Health server error:', error);
    }
  });

  server.listen(port, () => {
    logger.info(`Health server listening on port ${port}`);
  });

  // Store server reference for cleanup
  (startHealthServer as any)._server = server;
}

/**
 * Stop the health check HTTP server
 */
export function stopHealthServer(): void {
  const server = (startHealthServer as any)._server;
  if (server) {
    server.close(() => {
      logger.info('Health server stopped');
    });
    (startHealthServer as any)._server = null;
  }
}
