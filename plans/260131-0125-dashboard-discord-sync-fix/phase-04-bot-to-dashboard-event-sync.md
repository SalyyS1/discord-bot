# Phase 4: Bot to Dashboard Event Sync

## Context Links

- [Mutations Analysis](./research/researcher-02-mutations-redis-sync-analysis.md)
- Bot event publisher: `apps/bot/src/services/bot-redis-event-publisher.ts`
- Dashboard hooks: `apps/dashboard/src/hooks/`
- Query keys: `apps/dashboard/src/lib/query-keys.ts`

## Overview

**Priority:** P2 - Important
**Status:** Pending
**Effort:** 3 hours

Enable real-time sync from Discord bot to Dashboard. When giveaways or tickets are created via Discord commands, the Dashboard should display them without manual refresh.

## Key Insights

1. Bot publishes to `discord_events` channel via `RedisPublisherService`
2. Dashboard currently does not subscribe to `discord_events`
3. Event types already defined: MEMBER_JOIN, MEMBER_LEAVE, TICKET_CREATE, etc.
4. Dashboard uses TanStack Query with refetch capabilities
5. Two approaches: WebSocket subscription or polling with SSE

## Requirements

### Functional
- FR-1: Bot publishes GIVEAWAY_CREATE, GIVEAWAY_END events
- FR-2: Bot publishes TICKET_CREATE, TICKET_CLOSE events
- FR-3: Dashboard receives events and invalidates relevant queries
- FR-4: Giveaways page auto-updates when new giveaway created via Discord

### Non-Functional
- NFR-1: Event delivery within 5 seconds
- NFR-2: Dashboard handles disconnection gracefully
- NFR-3: No memory leaks from event subscriptions
- NFR-4: Works across multiple browser tabs

## Architecture

### Option A: Server-Sent Events (SSE) - Recommended

```
Discord Bot
    |
    +-- /giveaway create command
    |
    +-- Redis PUBLISH 'discord_events'
            |
            v
Dashboard API Route (/api/events/stream)
    |
    +-- Redis SUBSCRIBE 'discord_events'
    |
    +-- Filter by user's guild access
    |
    +-- SSE push to browser
            |
            v
Browser EventSource
    |
    +-- onmessage handler
    |
    +-- queryClient.invalidateQueries(['guild', guildId, 'giveaways'])
```

### Option B: Polling (Simpler but less real-time)

```
Dashboard Page
    |
    +-- useQuery with refetchInterval: 30000
    |
    +-- Polls /api/guilds/:id/giveaways every 30s
```

**Recommendation:** Start with Option B (polling) for simplicity, add SSE in future iteration.

## Related Code Files

### Files to Create
| File | Purpose |
|------|---------|
| `apps/dashboard/src/hooks/use-realtime-giveaways.ts` | Hook with polling/SSE for giveaways |
| `apps/dashboard/src/app/api/events/stream/route.ts` | SSE endpoint (future) |

### Files to Modify
| File | Changes |
|------|---------|
| `apps/bot/src/services/bot-redis-event-publisher.ts` | Add GIVEAWAY_CREATE, GIVEAWAY_END events |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/giveaway/page.tsx` | Use realtime hook |

## Implementation Steps

### Step 1: Add Bot Event Types (20 min)

1. Update bot event publisher to include giveaway events:

```typescript
// In bot-redis-event-publisher.ts or similar

export enum DiscordEventType {
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  TICKET_CREATE = 'TICKET_CREATE',
  TICKET_CLOSE = 'TICKET_CLOSE',
  GIVEAWAY_CREATE = 'GIVEAWAY_CREATE',    // NEW
  GIVEAWAY_END = 'GIVEAWAY_END',          // NEW
  GIVEAWAY_ENTRY = 'GIVEAWAY_ENTRY',      // NEW (optional)
}

interface DiscordEvent {
  type: DiscordEventType;
  guildId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}
```

### Step 2: Publish Giveaway Events from Bot (30 min)

2. In the giveaway command handler or service:

```typescript
// When giveaway is created via Discord command
async createGiveaway(guildId: string, prize: string, duration: number) {
  // ... create giveaway in DB

  // Publish event for dashboard
  await this.eventPublisher.publish({
    type: DiscordEventType.GIVEAWAY_CREATE,
    guildId,
    timestamp: Date.now(),
    data: {
      giveawayId: newGiveaway.id,
      prize: newGiveaway.prize,
    },
  });
}

// When giveaway ends
async endGiveaway(giveawayId: string) {
  // ... end giveaway, pick winners

  await this.eventPublisher.publish({
    type: DiscordEventType.GIVEAWAY_END,
    guildId,
    timestamp: Date.now(),
    data: {
      giveawayId,
      winnerId: winner?.id,
    },
  });
}
```

### Step 3: Create Realtime Giveaways Hook (45 min)

3. Create `apps/dashboard/src/hooks/use-realtime-giveaways.ts`:

```typescript
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@/lib/query-keys';

interface Giveaway {
  id: string;
  prize: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  entries: number;
  endsAt: string;
  // ... other fields
}

interface GiveawaysResponse {
  giveaways: Giveaway[];
}

async function fetchGiveaways(guildId: string): Promise<GiveawaysResponse> {
  const res = await fetch(`/api/guilds/${guildId}/giveaways`);
  if (!res.ok) throw new Error('Failed to fetch giveaways');
  const { data } = await res.json();
  return data;
}

/**
 * Hook for fetching giveaways with automatic refresh
 * Uses polling for near-realtime updates
 */
export function useRealtimeGiveaways(guildId: string | null, options?: {
  refetchInterval?: number;
  enabled?: boolean;
}) {
  const { refetchInterval = 30000, enabled = true } = options ?? {};

  return useQuery({
    queryKey: guildId ? queryKeys.guildGiveaways(guildId) : ['noop'],
    queryFn: () => fetchGiveaways(guildId!),
    enabled: !!guildId && enabled,
    staleTime: 10000, // Consider stale after 10 seconds
    refetchInterval, // Poll every 30 seconds by default
    refetchIntervalInBackground: false, // Don't poll when tab is hidden
  });
}

/**
 * Hook to manually trigger giveaway refetch
 * Useful when user performs an action
 */
export function useInvalidateGiveaways() {
  const queryClient = useQueryClient();

  return (guildId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.guildGiveaways(guildId),
    });
  };
}
```

### Step 4: Update Giveaway Page to Use Realtime Hook (30 min)

4. Update `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/giveaway/page.tsx`:

```typescript
import { useRealtimeGiveaways, useInvalidateGiveaways } from '@/hooks/use-realtime-giveaways';

// Replace manual fetch with hook:
const {
  data: giveawaysData,
  isLoading: giveawaysLoading,
  refetch: refetchGiveaways,
} = useRealtimeGiveaways(guildId, {
  refetchInterval: 15000, // Poll every 15 seconds on giveaway page
});

// Use data from hook:
const giveaways = giveawaysData?.giveaways ?? [];

// After creating giveaway, invalidate:
const invalidateGiveaways = useInvalidateGiveaways();

const handleCreateGiveaway = async () => {
  // ... create giveaway
  if (res.ok) {
    toast.success('Giveaway created!');
    invalidateGiveaways(guildId);
    setShowCreateDialog(false);
  }
};
```

### Step 5: Create Tickets Realtime Hook (30 min)

5. Create `apps/dashboard/src/hooks/use-realtime-tickets.ts`:

```typescript
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Ticket {
  id: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  // ... other fields
}

async function fetchTickets(guildId: string): Promise<Ticket[]> {
  const res = await fetch(`/api/guilds/${guildId}/tickets`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const { data } = await res.json();
  return data;
}

export function useRealtimeTickets(guildId: string | null, options?: {
  refetchInterval?: number;
}) {
  const { refetchInterval = 30000 } = options ?? {};

  return useQuery({
    queryKey: guildId ? queryKeys.guildTickets(guildId) : ['noop'],
    queryFn: () => fetchTickets(guildId!),
    enabled: !!guildId,
    staleTime: 10000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

export function useInvalidateTickets() {
  const queryClient = useQueryClient();
  return (guildId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.guildTickets(guildId),
    });
  };
}
```

### Step 6: Future Enhancement - SSE Endpoint (Optional, 60 min)

6. For true real-time, create SSE endpoint:

Create `apps/dashboard/src/app/api/events/stream/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import Redis from 'ioredis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) {
    return new Response('Missing guildId', { status: 400 });
  }

  // TODO: Verify user has access to this guild

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const redis = new Redis(process.env.REDIS_URL!);

      await redis.subscribe('discord_events');

      redis.on('message', (channel, message) => {
        try {
          const event = JSON.parse(message);
          if (event.guildId === guildId) {
            const data = `data: ${message}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (e) {
          console.error('Failed to parse event:', e);
        }
      });

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        redis.unsubscribe();
        redis.quit();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Step 7: SSE Client Hook (Optional, 30 min)

7. Create `apps/dashboard/src/hooks/use-discord-events.ts`:

```typescript
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface DiscordEvent {
  type: string;
  guildId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export function useDiscordEvents(guildId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!guildId) return;

    const eventSource = new EventSource(`/api/events/stream?guildId=${guildId}`);

    eventSource.onmessage = (event) => {
      try {
        const data: DiscordEvent = JSON.parse(event.data);

        switch (data.type) {
          case 'GIVEAWAY_CREATE':
          case 'GIVEAWAY_END':
            queryClient.invalidateQueries({
              queryKey: queryKeys.guildGiveaways(guildId),
            });
            break;
          case 'TICKET_CREATE':
          case 'TICKET_CLOSE':
            queryClient.invalidateQueries({
              queryKey: queryKeys.guildTickets(guildId),
            });
            break;
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      // Will auto-reconnect
      console.warn('SSE connection error, reconnecting...');
    };

    return () => {
      eventSource.close();
    };
  }, [guildId, queryClient]);
}
```

## Todo List

- [x] Add GIVEAWAY_CREATE, GIVEAWAY_END event types to bot
- [x] Publish giveaway events from bot giveaway service
- [x] Create use-realtime-giveaways.ts hook with polling (existed from Phase 3)
- [x] Update Giveaway page to use realtime hook
- [x] Create use-realtime-tickets.ts hook with polling (existed from Phase 3)
- [x] Update Tickets page to use realtime hook
- [ ] Test: Create giveaway via Discord, verify Dashboard updates within 30s
- [ ] (Optional) Implement SSE endpoint for true real-time
- [ ] (Optional) Create useDiscordEvents hook for SSE

## Success Criteria

1. **Polling Works:** Giveaways page auto-refreshes every 15-30 seconds
2. **No Manual Refresh:** New Discord-created giveaways appear automatically
3. **Query Invalidation:** Creating giveaway via Dashboard immediately shows it
4. **No Memory Leaks:** Polling stops when page is hidden or unmounted

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Polling causes high API load | Medium | Low | Use refetchIntervalInBackground: false |
| SSE connection instability | Low | Medium | EventSource auto-reconnects |
| Redis pubsub message loss | Low | Low | Dashboard still has polling fallback |

## Security Considerations

- SSE endpoint must verify user has guild access
- Don't expose sensitive event data to unauthorized users
- Rate limit SSE connections per user

## Next Steps

After all phases complete:
1. Run end-to-end testing across all affected pages
2. Monitor Redis message flow in production
3. Consider adding SSE for true real-time experience
4. Document the sync architecture for future maintenance
