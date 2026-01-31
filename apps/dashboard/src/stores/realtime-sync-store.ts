'use client';

import { create } from 'zustand';
import type { AnySyncEvent } from '@repo/types';

interface RealtimeState {
  // Connection status
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Recent events
  recentEvents: AnySyncEvent[];
  addEvent: (event: AnySyncEvent) => void;
  clearEvents: () => void;

  // Event counts by type
  eventCounts: Record<string, number>;
  incrementEventCount: (type: string) => void;
  resetEventCounts: () => void;

  // Subscribed guilds
  subscribedGuilds: Set<string>;
  subscribeGuild: (guildId: string) => void;
  unsubscribeGuild: (guildId: string) => void;

  // Last activity timestamp
  lastActivity: number;
  updateActivity: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  // Connection status
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Recent events (keep last 50)
  recentEvents: [],
  addEvent: (event) =>
    set((state) => ({
      recentEvents: [event, ...state.recentEvents].slice(0, 50),
      lastActivity: Date.now(),
    })),
  clearEvents: () => set({ recentEvents: [] }),

  // Event counts
  eventCounts: {},
  incrementEventCount: (type) =>
    set((state) => ({
      eventCounts: {
        ...state.eventCounts,
        [type]: (state.eventCounts[type] || 0) + 1,
      },
    })),
  resetEventCounts: () => set({ eventCounts: {} }),

  // Subscribed guilds
  subscribedGuilds: new Set(),
  subscribeGuild: (guildId) =>
    set((state) => {
      const newSet = new Set(state.subscribedGuilds);
      newSet.add(guildId);
      return { subscribedGuilds: newSet };
    }),
  unsubscribeGuild: (guildId) =>
    set((state) => {
      const newSet = new Set(state.subscribedGuilds);
      newSet.delete(guildId);
      return { subscribedGuilds: newSet };
    }),

  // Last activity
  lastActivity: Date.now(),
  updateActivity: () => set({ lastActivity: Date.now() }),
}));
