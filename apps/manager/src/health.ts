/**
 * Health Monitor for Bot Processes
 *
 * Monitors health of spawned bot processes via IPC.
 */

import { BotSpawner } from './spawner.js';
import { BotHealth, IPCMessage } from './types.js';
import { logger } from './logger.js';
import { memoryStore } from '@repo/security';

export class HealthMonitor {
  private healthData = new Map<string, BotHealth>();
  private spawner: BotSpawner;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly pingIntervalMs: number;
  private readonly healthTimeout: number;

  constructor(spawner: BotSpawner, options?: {
    pingIntervalMs?: number;
    healthTimeout?: number;
  }) {
    this.spawner = spawner;
    this.pingIntervalMs = options?.pingIntervalMs ?? 30000;
    this.healthTimeout = options?.healthTimeout ?? 60000;
  }

  /**
   * Start monitoring bot health
   */
  start(): void {
    // Listen for health responses from bots
    this.spawner.on('bot:message', (tenantId: string, msg: IPCMessage) => {
      if (msg.type === 'health') {
        const data = msg.data as { guilds: number; uptime: number; memory: number };
        this.updateHealth(tenantId, {
          tenantId,
          status: 'healthy',
          guilds: data.guilds,
          uptime: data.uptime,
          memory: data.memory,
          lastPing: new Date(),
        });
      }
    });

    // Listen for bot ready events
    this.spawner.on('bot:ready', (tenantId: string, guilds: number) => {
      this.updateHealth(tenantId, {
        tenantId,
        status: 'healthy',
        guilds,
        uptime: 0,
        memory: 0,
        lastPing: new Date(),
      });
    });

    // Listen for bot stop events
    this.spawner.on('bot:stopped', (tenantId: string) => {
      this.healthData.delete(tenantId);
    });

    // Listen for bot errors
    this.spawner.on('bot:error', (tenantId: string, error: Error) => {
      const existing = this.healthData.get(tenantId);
      this.updateHealth(tenantId, {
        tenantId,
        status: 'unhealthy',
        guilds: existing?.guilds ?? 0,
        uptime: existing?.uptime ?? 0,
        memory: existing?.memory ?? 0,
        lastPing: new Date(),
        error: error.message,
      });
    });

    // Start periodic health checks
    this.pingInterval = setInterval(() => this.pingAll(), this.pingIntervalMs);

    logger.info('Health monitor started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.healthData.clear();
    logger.info('Health monitor stopped');
  }

  /**
   * Update health data for a tenant
   */
  private updateHealth(tenantId: string, health: BotHealth): void {
    this.healthData.set(tenantId, health);
  }

  /**
   * Send health check request to all running bots
   */
  private pingAll(): void {
    const runningBots = this.spawner.getRunningBots();

    for (const tenantId of runningBots) {
      // Send health request via IPC
      this.spawner.sendMessage(tenantId, { type: 'health_request' });
    }

    // Check for stale health data
    const now = Date.now();
    for (const [tenantId, health] of this.healthData) {
      const lastPingAge = now - health.lastPing.getTime();
      if (lastPingAge > this.healthTimeout) {
        health.status = 'unhealthy';
        health.error = 'Health check timeout';
      }
    }
  }

  /**
   * Get health data for a specific tenant
   */
  getHealth(tenantId: string): BotHealth | undefined {
    return this.healthData.get(tenantId);
  }

  /**
   * Get health data for all bots
   */
  getAllHealth(): Map<string, BotHealth> {
    return new Map(this.healthData);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
    totalGuilds: number;
    memoryStore: { size: number; maxSize: number };
  } {
    let healthy = 0;
    let unhealthy = 0;
    let unknown = 0;
    let totalGuilds = 0;

    for (const health of this.healthData.values()) {
      totalGuilds += health.guilds;
      switch (health.status) {
        case 'healthy':
          healthy++;
          break;
        case 'unhealthy':
          unhealthy++;
          break;
        default:
          unknown++;
      }
    }

    return {
      total: this.healthData.size,
      healthy,
      unhealthy,
      unknown,
      totalGuilds,
      memoryStore: memoryStore.getStats(),
    };
  }
}
