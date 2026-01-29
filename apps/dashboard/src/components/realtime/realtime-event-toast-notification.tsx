'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import type { AnySyncEvent } from '@repo/types';

interface RealtimeToastProps {
  guildId?: string;
  token?: string;
  enabled?: boolean;
}

/**
 * Component for showing toast notifications for real-time events
 */
export function RealtimeToast({ guildId, token, enabled = true }: RealtimeToastProps): null {
  const { lastEvent, isConnected } = useRealtimeSync({
    guildId,
    token,
    enabled,
  });

  useEffect(() => {
    if (!lastEvent) return;

    const event = lastEvent;

    switch (event.type) {
      case 'MEMBER_JOIN':
        toast.success(`${event.data.username} joined the server`, {
          description: 'New member',
        });
        break;

      case 'MEMBER_LEAVE':
        toast.info(`${event.data.username} left the server`, {
          description: 'Member left',
        });
        break;

      case 'TICKET_CREATE':
        toast.info(`New ticket created by ${event.data.username}`, {
          description: event.data.category ? `Category: ${event.data.category}` : undefined,
        });
        break;

      case 'TICKET_CLAIM':
        toast.success(`Ticket claimed by ${event.data.claimerName}`, {
          description: 'Ticket claimed',
        });
        break;

      case 'TICKET_CLOSE':
        toast.info('Ticket closed', {
          description: event.data.reason || 'No reason provided',
        });
        break;

      case 'LEVEL_UP':
        toast.success(`${event.data.username} reached level ${event.data.level}!`, {
          description: `Total XP: ${event.data.totalXp}`,
        });
        break;

      case 'XP_GAIN':
        // Don't show toast for XP gain (too frequent)
        break;

      case 'MOD_ACTION':
        const action = event.data.action as string;
        toast.warning(`${action}: ${event.data.targetName}`, {
          description: `By ${event.data.moderatorName}: ${event.data.reason || 'No reason'}`,
        });
        break;

      case 'GIVEAWAY_START':
        toast.success(`New giveaway: ${event.data.prize}`, {
          description: `Winners: ${event.data.winners}`,
        });
        break;

      case 'SETTINGS_UPDATE':
        toast.info('Settings updated', {
          description: `Module: ${event.data.module}`,
        });
        break;

      default:
        // Ignore unknown events
        break;
    }
  }, [lastEvent]);

  // Show connection status
  useEffect(() => {
    if (enabled && token) {
      if (isConnected) {
        toast.success('Real-time sync connected', {
          id: 'realtime-status',
          duration: 2000,
        });
      } else {
        toast.loading('Connecting to real-time sync...', {
          id: 'realtime-status',
        });
      }
    }
  }, [isConnected, enabled, token]);

  return null;
}
