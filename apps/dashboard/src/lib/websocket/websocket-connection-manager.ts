import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';
import { logger } from '../logger';

/**
 * WebSocket connection with metadata
 */
export interface WsConnection {
  ws: WebSocket;
  userId: string;
  guildIds: Set<string>;
  authenticated: boolean;
  lastPing: number;
}

/**
 * Connection manager for WebSocket clients
 */
class ConnectionManager {
  private connections = new Map<WebSocket, WsConnection>();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Add new connection
   */
  add(ws: WebSocket, req: IncomingMessage): WsConnection {
    const conn: WsConnection = {
      ws,
      userId: '',
      guildIds: new Set(),
      authenticated: false,
      lastPing: Date.now(),
    };

    this.connections.set(ws, conn);
    logger.info(`WebSocket connection added (total: ${this.connections.size})`);

    return conn;
  }

  /**
   * Remove connection
   */
  remove(ws: WebSocket): void {
    const conn = this.connections.get(ws);
    if (conn) {
      this.connections.delete(ws);
      logger.info(
        `WebSocket connection removed for user ${conn.userId} (total: ${this.connections.size})`
      );
    }
  }

  /**
   * Get connection by WebSocket
   */
  get(ws: WebSocket): WsConnection | undefined {
    return this.connections.get(ws);
  }

  /**
   * Get all connections for a specific guild
   */
  getByGuildId(guildId: string): WsConnection[] {
    return Array.from(this.connections.values()).filter((conn) =>
      conn.guildIds.has(guildId)
    );
  }

  /**
   * Get all connections for a specific user
   */
  getByUserId(userId: string): WsConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.userId === userId
    );
  }

  /**
   * Subscribe connection to guild
   */
  subscribeToGuild(ws: WebSocket, guildId: string): boolean {
    const conn = this.connections.get(ws);
    if (!conn || !conn.authenticated) {
      return false;
    }

    conn.guildIds.add(guildId);
    logger.info(`User ${conn.userId} subscribed to guild ${guildId}`);
    return true;
  }

  /**
   * Unsubscribe connection from guild
   */
  unsubscribeFromGuild(ws: WebSocket, guildId: string): boolean {
    const conn = this.connections.get(ws);
    if (!conn) {
      return false;
    }

    conn.guildIds.delete(guildId);
    logger.info(`User ${conn.userId} unsubscribed from guild ${guildId}`);
    return true;
  }

  /**
   * Authenticate connection
   */
  authenticate(ws: WebSocket, userId: string): boolean {
    const conn = this.connections.get(ws);
    if (!conn) {
      return false;
    }

    conn.userId = userId;
    conn.authenticated = true;
    logger.info(`WebSocket authenticated for user ${userId}`);
    return true;
  }

  /**
   * Update last ping time
   */
  updatePing(ws: WebSocket): void {
    const conn = this.connections.get(ws);
    if (conn) {
      conn.lastPing = Date.now();
    }
  }

  /**
   * Start ping interval to keep connections alive
   */
  startPingInterval(): void {
    if (this.pingInterval) {
      return;
    }

    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      for (const [ws, conn] of this.connections.entries()) {
        // Close stale connections
        if (now - conn.lastPing > timeout) {
          logger.warn(`Closing stale WebSocket for user ${conn.userId}`);
          ws.close(1000, 'Timeout');
          this.remove(ws);
          continue;
        }

        // Send ping
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop ping interval
   */
  stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const [ws] of this.connections.entries()) {
      ws.close(1000, 'Server shutdown');
    }
    this.connections.clear();
    this.stopPingInterval();
  }

  /**
   * Get total connection count
   */
  get size(): number {
    return this.connections.size;
  }
}

export const connectionManager = new ConnectionManager();
