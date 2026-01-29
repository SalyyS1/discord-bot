'use client';

import type { AnySyncEvent, WsMessage } from '@repo/types';

/**
 * WebSocket client singleton for real-time sync
 */
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private eventHandlers = new Set<(event: AnySyncEvent) => void>();
  private statusHandlers = new Set<(status: 'connected' | 'disconnected' | 'error') => void>();
  private authenticated = false;
  private subscribedGuilds = new Set<string>();
  private sessionToken: string | null = null;

  /**
   * Connect to WebSocket server
   */
  connect(token: string, guildId?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.sessionToken = token;
    this.cleanup();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.notifyStatus('connected');

        // Authenticate
        this.send({ type: 'auth', token, guildId });
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.notifyStatus('error');
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.authenticated = false;
        this.notifyStatus('disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WsMessage;

      switch (message.type) {
        case 'connected':
          console.log('[WebSocket] Connection established');
          break;

        case 'authenticated':
          console.log('[WebSocket] Authenticated');
          this.authenticated = true;

          // Re-subscribe to guilds
          for (const guildId of this.subscribedGuilds) {
            this.subscribeToGuild(guildId);
          }
          break;

        case 'subscribed':
          console.log(`[WebSocket] Subscribed to guild ${message.guildId}`);
          break;

        case 'unsubscribed':
          console.log(`[WebSocket] Unsubscribed from guild ${message.guildId}`);
          break;

        case 'event':
          this.notifyEvent(message.event);
          break;

        case 'error':
          console.error('[WebSocket] Server error:', message.message);
          break;

        case 'ping':
          this.send({ type: 'pong' });
          break;

        case 'pong':
          // Keep-alive acknowledged
          break;

        default:
          console.warn('[WebSocket] Unknown message type:', message);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Send message to server
   */
  private send(message: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to guild events
   */
  subscribeToGuild(guildId: string): void {
    this.subscribedGuilds.add(guildId);

    if (this.authenticated) {
      this.send({ type: 'subscribe', guildId });
    }
  }

  /**
   * Unsubscribe from guild events
   */
  unsubscribeFromGuild(guildId: string): void {
    this.subscribedGuilds.delete(guildId);
    this.send({ type: 'unsubscribe', guildId });
  }

  /**
   * Register event handler
   */
  onEvent(handler: (event: AnySyncEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Register status handler
   */
  onStatus(handler: (status: 'connected' | 'disconnected' | 'error') => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Notify event handlers
   */
  private notifyEvent(event: AnySyncEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[WebSocket] Event handler error:', error);
      }
    }
  }

  /**
   * Notify status handlers
   */
  private notifyStatus(status: 'connected' | 'disconnected' | 'error'): void {
    for (const handler of this.statusHandlers) {
      try {
        handler(status);
      } catch (error) {
        console.error('[WebSocket] Status handler error:', error);
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;

      if (this.sessionToken) {
        this.connect(this.sessionToken);
      }
    }, delay);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }

      this.ws = null;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.cleanup();
    this.authenticated = false;
    this.subscribedGuilds.clear();
    this.eventHandlers.clear();
    this.statusHandlers.clear();
    this.sessionToken = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.authenticated;
  }
}

export const wsClient = new WebSocketClient();
