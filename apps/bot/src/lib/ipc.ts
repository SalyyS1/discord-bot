/**
 * IPC Message Handler for Multi-Tenant Bot Manager Communication
 * 
 * Handles messages from the parent manager process when running in tenant mode.
 */

import { client } from './client.js';
import { logger } from '../utils/logger.js';

interface IPCMessage {
  type: string;
  data?: unknown;
}

/**
 * Send a message to the parent process (if running as child process)
 */
export function sendToParent(message: IPCMessage): void {
  if (process.send) {
    try {
      process.send(message);
    } catch (error) {
      logger.error('[IPC] Failed to send message:', error);
    }
  }
}

/**
 * Send ready notification to parent
 */
export function sendReady(): void {
  sendToParent({
    type: 'ready',
    data: {
      guilds: client.guilds.cache.size,
    },
  });
}

/**
 * Send error notification to parent
 */
export function sendError(error: Error): void {
  sendToParent({
    type: 'error',
    data: {
      message: error.message,
      stack: error.stack,
    },
  });
}

/**
 * Send health data to parent
 */
export function sendHealth(): void {
  const memoryUsage = process.memoryUsage();
  sendToParent({
    type: 'health',
    data: {
      guilds: client.guilds.cache.size,
      uptime: client.uptime ?? 0,
      memory: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
    },
  });
}

/**
 * Initialize IPC message handler
 */
export function initIPC(shutdownCallback: () => Promise<void>): void {
  // Only set up if running as a child process
  if (!process.send) {
    logger.debug('[IPC] Not running as child process, skipping IPC setup');
    return;
  }

  logger.info('[IPC] Initializing IPC message handler');

  process.on('message', async (msg: IPCMessage) => {
    logger.debug(`[IPC] Received message: ${msg.type}`);

    switch (msg.type) {
      case 'health_request':
        sendHealth();
        break;

      case 'shutdown':
        logger.info('[IPC] Received shutdown command');
        await shutdownCallback();
        break;

      default:
        logger.warn(`[IPC] Unknown message type: ${msg.type}`);
    }
  });
}

/**
 * Check if running in tenant mode (as child process)
 */
export function isChildProcess(): boolean {
  return !!process.send;
}
