/**
 * Memory Usage Monitor
 * Tracks heap usage and TTL map sizes to detect memory leaks
 */

import { cooldownMap, sessionMap } from './ttl-map-with-auto-cleanup.js';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  cooldownMapSize: number;
  sessionMapSize: number;
}

/**
 * Get current memory stats
 */
export function getMemoryStats(): MemoryStats {
  const mem = process.memoryUsage();

  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
    cooldownMapSize: cooldownMap.size,
    sessionMapSize: sessionMap.size,
  };
}

/**
 * Log memory stats periodically
 */
export function startMemoryMonitoring(intervalMs = 300000): NodeJS.Timeout {
  return setInterval(() => {
    const stats = getMemoryStats();
    console.log(
      `[Memory] Heap: ${stats.heapUsed}/${stats.heapTotal}MB | ` +
      `External: ${stats.external}MB | ` +
      `Cooldowns: ${stats.cooldownMapSize} | ` +
      `Sessions: ${stats.sessionMapSize}`
    );

    // Warn if heap usage is high
    if (stats.heapUsed > 500) {
      console.warn('[Memory] High heap usage detected!');
    }
  }, intervalMs);
}
