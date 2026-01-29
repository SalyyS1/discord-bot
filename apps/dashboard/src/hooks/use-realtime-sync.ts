'use client';

import { useEffect, useState, useCallback } from 'react';
import { wsClient } from '@/lib/websocket/realtime-websocket-client';
import type { AnySyncEvent, EventType } from '@repo/types';

/**
 * Hook options
 */
interface UseRealtimeSyncOptions {
  guildId?: string;
  token?: string;
  eventTypes?: EventType[];
  onEvent?: (event: AnySyncEvent) => void;
  enabled?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeSyncReturn {
  isConnected: boolean;
  lastEvent: AnySyncEvent | null;
  error: string | null;
  reconnect: () => void;
}

/**
 * Hook for real-time sync with Discord bot
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions = {}): UseRealtimeSyncReturn {
  const { guildId, token, eventTypes, onEvent, enabled = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AnySyncEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle incoming events
  const handleEvent = useCallback(
    (event: AnySyncEvent) => {
      // Filter by event type if specified
      if (eventTypes && !eventTypes.includes(event.type)) {
        return;
      }

      // Filter by guild if specified
      if (guildId && event.guildId !== guildId) {
        return;
      }

      setLastEvent(event);
      onEvent?.(event);
    },
    [guildId, eventTypes, onEvent]
  );

  // Handle connection status
  const handleStatus = useCallback(
    (status: 'connected' | 'disconnected' | 'error') => {
      setIsConnected(status === 'connected');

      if (status === 'error') {
        setError('WebSocket connection error');
      } else {
        setError(null);
      }
    },
    []
  );

  // Reconnect function
  const reconnect = useCallback(() => {
    if (token) {
      wsClient.disconnect();
      wsClient.connect(token, guildId);
    }
  }, [token, guildId]);

  // Setup connection
  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    // Connect to WebSocket
    wsClient.connect(token, guildId);

    // Register handlers
    const unsubEvent = wsClient.onEvent(handleEvent);
    const unsubStatus = wsClient.onStatus(handleStatus);

    // Subscribe to guild if specified
    if (guildId) {
      wsClient.subscribeToGuild(guildId);
    }

    return () => {
      unsubEvent();
      unsubStatus();

      // Unsubscribe from guild
      if (guildId) {
        wsClient.unsubscribeFromGuild(guildId);
      }
    };
  }, [enabled, token, guildId, handleEvent, handleStatus]);

  return {
    isConnected,
    lastEvent,
    error,
    reconnect,
  };
}

/**
 * Hook for listening to specific event type
 */
export function useRealtimeEvent<T extends AnySyncEvent>(
  eventType: EventType,
  handler: (event: T) => void,
  guildId?: string
): void {
  useEffect(() => {
    const unsubscribe = wsClient.onEvent((event) => {
      if (event.type === eventType) {
        // Filter by guild if specified
        if (!guildId || event.guildId === guildId) {
          handler(event as T);
        }
      }
    });

    return unsubscribe;
  }, [eventType, guildId, handler]);
}
