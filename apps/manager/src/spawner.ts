/**
 * Bot Spawner Service
 * 
 * Manages spawning, stopping, and monitoring of tenant bot processes.
 * Each bot runs as an isolated child process with its own environment.
 * 
 * SECURITY: Discord tokens are stored encrypted and only decrypted
 * at spawn time within this service. Tokens are never logged or
 * passed to external code in plaintext.
 */

import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { TenantConfig, BotStatus, IPCMessage } from './types.js';
import { logger } from './logger.js';
import { getEncryptionService } from '@repo/security';

interface BotProcess {
  process: ChildProcess;
  config: TenantConfig;
  status: BotStatus;
  startedAt: Date;
  restartCount: number;
}

export interface SpawnerEvents {
  'bot:started': (tenantId: string) => void;
  'bot:stopped': (tenantId: string, code: number | null) => void;
  'bot:error': (tenantId: string, error: Error) => void;
  'bot:message': (tenantId: string, message: IPCMessage) => void;
  'bot:ready': (tenantId: string, guilds: number) => void;
}

export class BotSpawner extends EventEmitter {
  private processes = new Map<string, BotProcess>();
  private readonly botEntryPoint: string;
  private readonly maxRestarts: number;
  private readonly restartDelay: number;

  constructor(options?: {
    botEntryPoint?: string;
    maxRestarts?: number;
    restartDelay?: number;
  }) {
    super();
    // Path to compiled bot entry point
    this.botEntryPoint = options?.botEntryPoint || path.resolve(process.cwd(), '../bot/dist/index.js');
    this.maxRestarts = options?.maxRestarts ?? 3;
    this.restartDelay = options?.restartDelay ?? 5000;
  }

  /**
   * Spawn a new bot process for a tenant
   */
  async spawn(config: TenantConfig): Promise<void> {
    const { tenantId } = config;

    // Atomic check-and-reserve to prevent race conditions
    const existing = this.processes.get(tenantId);
    if (existing) {
      if (existing.status === 'running' || existing.status === 'starting') {
        throw new Error(`Bot for tenant ${tenantId} is already running`);
      }
    }

    // Preserve restart count from previous attempts
    const preservedRestartCount = existing?.restartCount ?? 0;

    // Reserve slot immediately to prevent concurrent spawns
    this.processes.set(tenantId, {
      process: null as any, // Will be set after fork
      config,
      status: 'starting',
      startedAt: new Date(),
      restartCount: preservedRestartCount,
    });

    // Decrypt token securely - only here at spawn time
    let decryptedToken: string;
    try {
      const encryptionService = getEncryptionService();
      decryptedToken = encryptionService.decrypt(config.discordTokenEncrypted);
      logger.debug(`Token decrypted successfully`, { tenantId });
    } catch (err) {
      const error = err as Error;
      logger.error(`Failed to decrypt token: ${error.message}`, { tenantId });
      // Cleanup reserved slot on failure
      this.processes.delete(tenantId);
      throw new Error(`Token decryption failed for tenant ${tenantId}`);
    }

    // Build environment for the child process
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      TENANT_ID: tenantId,
      DISCORD_TOKEN: decryptedToken,
      DISCORD_CLIENT_ID: config.discordClientId,
      DATABASE_URL: config.databaseUrl,
      REDIS_PREFIX: config.redisPrefix || `tenant:${tenantId}:`,
      // Disable health server in spawned bots (manager handles health)
      HEALTH_PORT: '0',
    };

    logger.info(`Starting bot for tenant`, { tenantId });

    const child = fork(this.botEntryPoint, [], {
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      detached: false,
    });

    // Update the reserved slot with actual process
    const botProcess = this.processes.get(tenantId)!;
    botProcess.process = child;

    // Handle process events
    this.setupProcessHandlers(tenantId, child, config);

    this.emit('bot:started', tenantId);
  }

  /**
   * Setup event handlers for a bot process
   */
  private setupProcessHandlers(
    tenantId: string,
    child: ChildProcess,
    config: TenantConfig
  ): void {
    // Handle IPC messages from bot
    child.on('message', (msg: IPCMessage) => {
      const botProcess = this.processes.get(tenantId);
      if (!botProcess) return;

      if (msg.type === 'ready') {
        botProcess.status = 'running';
        const data = msg.data as { guilds: number };
        this.emit('bot:ready', tenantId, data.guilds);
      } else if (msg.type === 'error') {
        const data = msg.data as { message: string };
        this.emit('bot:error', tenantId, new Error(data.message));
      }

      this.emit('bot:message', tenantId, msg);
    });

    // Handle process exit
    child.on('exit', (code, signal) => {
      const botProcess = this.processes.get(tenantId);
      if (!botProcess) return;

      logger.info(`Bot exited`, { tenantId, context: { code, signal } });

      botProcess.status = 'stopped';
      this.emit('bot:stopped', tenantId, code);

      // Auto-restart if not intentionally stopped
      if (code !== 0 && botProcess.restartCount < this.maxRestarts) {
        this.scheduleRestart(tenantId, config);
      } else if (botProcess.restartCount >= this.maxRestarts) {
        botProcess.status = 'error';
        logger.error(`Bot exceeded max restarts (${this.maxRestarts})`, { tenantId });
      }
    });

    // Handle process errors
    child.on('error', (error) => {
      logger.error(`Bot process error: ${error.message}`, { tenantId });
      this.emit('bot:error', tenantId, error);
    });

    // Capture stdout/stderr
    child.stdout?.on('data', (data) => {
      logger.debug(`[stdout] ${data.toString().trim()}`, { tenantId });
    });

    child.stderr?.on('data', (data) => {
      logger.warn(`[stderr] ${data.toString().trim()}`, { tenantId });
    });
  }

  /**
   * Schedule a restart after delay
   */
  private scheduleRestart(tenantId: string, config: TenantConfig): void {
    const botProcess = this.processes.get(tenantId);
    if (!botProcess) return;

    // Increment restart count before deletion
    const currentRestartCount = botProcess.restartCount + 1;
    logger.info(`Scheduling restart ${currentRestartCount}/${this.maxRestarts}`, { tenantId });

    // Update restart count in place so spawn() can preserve it
    botProcess.restartCount = currentRestartCount;

    setTimeout(async () => {
      try {
        // Don't delete - spawn() will preserve restartCount from existing entry
        await this.spawn(config);
      } catch (error) {
        logger.error(`Failed to restart bot: ${error}`, { tenantId });
      }
    }, this.restartDelay);
  }

  /**
   * Stop a bot process gracefully
   */
  async stop(tenantId: string): Promise<void> {
    const botProcess = this.processes.get(tenantId);
    if (!botProcess) {
      throw new Error(`No bot found for tenant ${tenantId}`);
    }

    if (botProcess.status === 'stopped') {
      return;
    }

    logger.info(`Stopping bot`, { tenantId });
    botProcess.status = 'stopping';
    botProcess.restartCount = this.maxRestarts; // Prevent auto-restart

    // Send shutdown message via IPC
    try {
      botProcess.process.send({ type: 'shutdown' });
    } catch {
      // Process might already be dead
    }

    // Force kill after timeout
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (botProcess.process.exitCode === null) {
          logger.warn(`Force killing bot`, { tenantId });
          botProcess.process.kill('SIGKILL');
        }
        resolve();
      }, 10000);

      botProcess.process.once('exit', () => {
        clearTimeout(timeout);
        this.processes.delete(tenantId);
        resolve();
      });
    });
  }

  /**
   * Restart a bot
   */
  async restart(tenantId: string): Promise<void> {
    const botProcess = this.processes.get(tenantId);
    if (!botProcess) {
      throw new Error(`No bot found for tenant ${tenantId}`);
    }

    const config = botProcess.config;
    await this.stop(tenantId);
    await this.spawn(config);
  }

  /**
   * Get status of a specific bot
   */
  getStatus(tenantId: string): BotStatus {
    const botProcess = this.processes.get(tenantId);
    return botProcess?.status ?? 'stopped';
  }

  /**
   * Get process info for a bot
   */
  getProcessInfo(tenantId: string): { pid?: number; status: BotStatus; startedAt?: Date; restarts: number } {
    const botProcess = this.processes.get(tenantId);
    if (!botProcess) {
      return { status: 'stopped', restarts: 0 };
    }
    return {
      pid: botProcess.process.pid,
      status: botProcess.status,
      startedAt: botProcess.startedAt,
      restarts: botProcess.restartCount,
    };
  }

  /**
   * Get all running bot tenant IDs
   */
  getRunningBots(): string[] {
    return Array.from(this.processes.entries())
      .filter(([_, bp]) => bp.status === 'running')
      .map(([id]) => id);
  }

  /**
   * Get count of running bots
   */
  getRunningCount(): number {
    return Array.from(this.processes.values())
      .filter(bp => bp.status === 'running')
      .length;
  }

  /**
   * Send IPC message to a bot
   */
  sendMessage(tenantId: string, message: IPCMessage): boolean {
    const botProcess = this.processes.get(tenantId);
    if (!botProcess || botProcess.status !== 'running') {
      return false;
    }

    try {
      botProcess.process.send(message);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stop all bots and cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down all bots...');
    const stopPromises = Array.from(this.processes.keys()).map(tenantId =>
      this.stop(tenantId).catch(err =>
        logger.error(`Error stopping bot: ${err}`, { tenantId })
      )
    );
    await Promise.all(stopPromises);
    logger.info('All bots stopped');
  }
}
