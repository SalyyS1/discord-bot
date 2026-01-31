import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { connectionManager } from './websocket-connection-manager';
import { onBotEvent } from '../redis/dashboard-redis-event-subscriber';
import { logger } from '../logger';
import type { WsMessage, AnySyncEvent } from '@repo/types';
import { auth } from '../auth';

let wss: WebSocketServer | null = null;
let botEventUnsubscribe: (() => void) | null = null;

/**
 * Verify session token and return userId
 */
async function verifyToken(token: string): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: { cookie: `better-auth.session_token=${token}` } });
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Handle WebSocket message
 */
async function handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
  try {
    const message = JSON.parse(data.toString()) as WsMessage;
    const conn = connectionManager.get(ws);

    if (!conn) {
      return;
    }

    switch (message.type) {
      case 'auth': {
        const userId = await verifyToken(message.token);
        if (!userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
          ws.close(1008, 'Authentication failed');
          return;
        }

        connectionManager.authenticate(ws, userId);
        ws.send(JSON.stringify({ type: 'authenticated', userId } as const));

        // Auto-subscribe to guild if provided
        if (message.guildId) {
          connectionManager.subscribeToGuild(ws, message.guildId);
        }
        break;
      }

      case 'subscribe': {
        if (!conn.authenticated) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }

        connectionManager.subscribeToGuild(ws, message.guildId);
        ws.send(JSON.stringify({ type: 'subscribed', guildId: message.guildId } as const));
        break;
      }

      case 'unsubscribe': {
        connectionManager.unsubscribeFromGuild(ws, message.guildId);
        ws.send(JSON.stringify({ type: 'unsubscribed', guildId: message.guildId } as const));
        break;
      }

      case 'ping': {
        connectionManager.updatePing(ws);
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      }

      case 'pong': {
        connectionManager.updatePing(ws);
        break;
      }

      default:
        logger.warn(`Unknown WebSocket message type: ${(message as any).type}`);
    }
  } catch (error) {
    logger.error('WebSocket message handling error:', { error: String(error) });
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
  }
}

/**
 * Broadcast event to subscribed clients
 */
function broadcastEvent(event: AnySyncEvent): void {
  const connections = connectionManager.getByGuildId(event.guildId);

  if (connections.length === 0) {
    return;
  }

  const message = JSON.stringify({ type: 'event', event });

  for (const conn of connections) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(message);
      } catch (error) {
        logger.error(`Failed to send event to client:`, { error: String(error) });
      }
    }
  }

  logger.debug(
    `Broadcasted ${event.type} to ${connections.length} client(s) for guild ${event.guildId}`
  );
}

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(httpServer: HttpServer): void {
  if (wss) {
    logger.warn('WebSocket server already initialized');
    return;
  }

  wss = new WebSocketServer({
    server: httpServer,
    path: '/api/ws',
  });

  wss.on('connection', (ws, req) => {
    connectionManager.add(ws, req);

    ws.on('message', (data) => {
      handleMessage(ws, data as Buffer);
    });

    ws.on('close', () => {
      connectionManager.remove(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', { message: error.message, stack: error.stack });
      connectionManager.remove(ws);
    });

    // Send initial message
    ws.send(JSON.stringify({ type: 'connected' }));
  });

  // Subscribe to bot events and broadcast
  botEventUnsubscribe = onBotEvent(broadcastEvent);

  // Start ping interval
  connectionManager.startPingInterval();

  logger.info('WebSocket server initialized');
}

/**
 * Shutdown WebSocket server
 */
export function shutdownWebSocketServer(): void {
  if (botEventUnsubscribe) {
    botEventUnsubscribe();
    botEventUnsubscribe = null;
  }

  connectionManager.closeAll();

  if (wss) {
    wss.close(() => {
      logger.info('WebSocket server shut down');
    });
    wss = null;
  }
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
