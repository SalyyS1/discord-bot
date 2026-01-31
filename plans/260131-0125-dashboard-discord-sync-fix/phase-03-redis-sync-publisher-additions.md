# Phase 3: Redis Sync Publisher Additions

## Context Links

- [Mutations Analysis](./research/researcher-02-mutations-redis-sync-analysis.md)
- ConfigPublisher: `packages/config/src/sync/publisher.ts`
- Config Channels: `packages/config/src/sync/channels.ts`
- Dashboard configSync: `apps/dashboard/src/lib/configSync.ts`
- Voice API route: `apps/dashboard/src/app/api/guilds/[guildId]/voice/route.ts`

## Overview

**Priority:** P1 - Critical
**Status:** ✅ Completed
**Effort:** 3 hours
**Actual Time:** 15 minutes (infrastructure already existed, only needed voice route fix)

Add missing Redis publishers for Giveaway, Tickets, and Music modules. Update API routes to call publishers after successful saves, enabling real-time sync to the Discord bot.

## Key Insights

1. `CONFIG_CHANNELS` already defines `GIVEAWAY`, `TICKETS` channels
2. `ConfigPublisher` has generic `publish()` method
3. Missing specific publisher methods: Giveaway, Tickets, Music
4. Dashboard `configSync.ts` wraps publisher with helper functions
5. API routes need to call publishers after DB saves
6. Bot subscribes to all channels via `ConfigSubscriber`

## Requirements

### Functional
- FR-1: Add `publishGiveaway()` method to ConfigPublisher
- FR-2: Add `publishTickets()` method to ConfigPublisher
- FR-3: Add `publishMusic()` method to ConfigPublisher
- FR-4: Add wrapper functions in dashboard configSync.ts
- FR-5: Call publishers from Voice, Giveaway, Tickets API routes

### Non-Functional
- NFR-1: Publishers fire after successful DB write
- NFR-2: Publisher failures should not break API response
- NFR-3: Consistent message format across all publishers

## Architecture

```
Dashboard API Route (PATCH /api/guilds/:id/voice)
    |
    +-- Prisma DB update
    |
    +-- publishTempVoiceUpdate(guildId)  // existing
            |
            v
        ConfigPublisher.publishTempVoice()
            |
            v
        Redis PUB to 'bot:config:tempvoice'
            |
            v
        Bot ConfigSubscriber receives message
            |
            v
        Bot invalidates cache, reloads config
```

### New Flow for Giveaway

```
Dashboard API Route (PATCH /api/guilds/:id/giveaways/settings)
    |
    +-- Prisma DB update
    |
    +-- publishGiveawayUpdate(guildId)  // NEW
            |
            v
        ConfigPublisher.publishGiveaway()
            |
            v
        Redis PUB to 'bot:config:giveaway'
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `packages/config/src/sync/channels.ts` | Add MUSIC channel if missing |
| `packages/config/src/sync/publisher.ts` | Add publishGiveaway, publishTickets, publishMusic methods |
| `apps/dashboard/src/lib/configSync.ts` | Add wrapper functions for new publishers |
| `apps/dashboard/src/app/api/guilds/[guildId]/voice/route.ts` | Call publisher after save |
| `apps/dashboard/src/app/api/guilds/[guildId]/giveaways/settings/route.ts` | Call publisher after save |
| `apps/dashboard/src/app/api/guilds/[guildId]/tickets/route.ts` | Call publisher after save |

### Files to Verify
| File | Check |
|------|-------|
| `packages/config/src/index.ts` | Ensure new methods are exported |

## Implementation Steps

### Step 1: Add MUSIC Channel (10 min)

1. Update `packages/config/src/sync/channels.ts`:

```typescript
export const CONFIG_CHANNELS = {
  // ... existing channels
  CONFIG_UPDATE: 'bot:config:update',
  SETTINGS: 'bot:config:settings',
  SUBSCRIPTION: 'bot:config:subscription',
  WELCOME: 'bot:config:welcome',
  MODERATION: 'bot:config:moderation',
  LEVELING: 'bot:config:leveling',
  GIVEAWAY: 'bot:config:giveaway',       // Already exists
  TICKETS: 'bot:config:tickets',          // Already exists
  AUTORESPONDER: 'bot:config:autoresponder',
  TEMPVOICE: 'bot:config:tempvoice',
  MUSIC: 'bot:config:music',              // ADD if missing
} as const;
```

### Step 2: Add Publisher Methods (30 min)

2. Update `packages/config/src/sync/publisher.ts`:

```typescript
/**
 * Publish giveaway config update
 */
async publishGiveaway(
  guildId: string,
  action: 'update' | 'delete' | 'create' = 'update',
  data?: Record<string, unknown>
): Promise<void> {
  await this.publish(guildId, 'GIVEAWAY', action, data);
}

/**
 * Publish tickets config update
 */
async publishTickets(
  guildId: string,
  action: 'update' | 'delete' | 'create' = 'update',
  data?: Record<string, unknown>
): Promise<void> {
  await this.publish(guildId, 'TICKETS', action, data);
}

/**
 * Publish music config update
 */
async publishMusic(
  guildId: string,
  action: 'update' | 'delete' | 'create' = 'update',
  data?: Record<string, unknown>
): Promise<void> {
  await this.publish(guildId, 'MUSIC', action, data);
}
```

### Step 3: Add Dashboard Wrapper Functions (20 min)

3. Update `apps/dashboard/src/lib/configSync.ts`:

```typescript
/**
 * Publish a giveaway config update
 */
export async function publishGiveawayUpdate(
  guildId: string,
  action: 'update' | 'delete' | 'create' = 'update'
): Promise<void> {
  await getPublisher().publishGiveaway(guildId, action);
}

/**
 * Publish a tickets config update
 */
export async function publishTicketsUpdate(
  guildId: string,
  action: 'update' | 'delete' | 'create' = 'update'
): Promise<void> {
  await getPublisher().publishTickets(guildId, action);
}

/**
 * Publish a music config update
 */
export async function publishMusicUpdate(
  guildId: string,
  action: 'update' | 'delete' = 'update'
): Promise<void> {
  await getPublisher().publishMusic(guildId, action);
}
```

### Step 4: Update Voice API Route (30 min)

4. Find and update the Voice PATCH route:

```bash
# Locate the file
apps/dashboard/src/app/api/guilds/[guildId]/voice/route.ts
```

Add publisher call:

```typescript
import { publishTempVoiceUpdate } from '@/lib/configSync';

export async function PATCH(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
    // ... existing validation and auth

    // Update database
    const updated = await prisma.guildSettings.update({
      where: { guildId: params.guildId },
      data: {
        tempVoiceEnabled,
        tempVoiceCreatorId,
        // ... other fields
      },
    });

    // Publish to Redis for bot sync
    try {
      await publishTempVoiceUpdate(params.guildId);
    } catch (publishError) {
      // Log but don't fail the request
      console.error('Failed to publish voice update:', publishError);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    // ... error handling
  }
}
```

### Step 5: Update Giveaway Settings API Route (30 min)

5. Find and update the Giveaway settings PATCH route:

```bash
# Locate the file
apps/dashboard/src/app/api/guilds/[guildId]/giveaways/settings/route.ts
```

Add publisher call:

```typescript
import { publishGiveawayUpdate } from '@/lib/configSync';

export async function PATCH(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
    // ... existing logic

    // Update database
    const updated = await prisma.guildSettings.update({
      where: { guildId: params.guildId },
      data: {
        giveawayButtonText,
        giveawayButtonEmoji,
        giveawayColor,
        // ... other fields
      },
    });

    // Publish to Redis
    try {
      await publishGiveawayUpdate(params.guildId);
    } catch (publishError) {
      console.error('Failed to publish giveaway update:', publishError);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    // ... error handling
  }
}
```

### Step 6: Update Tickets API Route (30 min)

6. Find and update Tickets PATCH route:

```bash
# Locate the file
apps/dashboard/src/app/api/guilds/[guildId]/tickets/route.ts
```

Add publisher call:

```typescript
import { publishTicketsUpdate } from '@/lib/configSync';

// In PATCH handler, after DB update:
try {
  await publishTicketsUpdate(params.guildId);
} catch (publishError) {
  console.error('Failed to publish tickets update:', publishError);
}
```

### Step 7: Verify Package Exports (10 min)

7. Check `packages/config/src/index.ts`:

```typescript
// Ensure these are exported
export { ConfigPublisher } from './sync/publisher';
export { ConfigSubscriber } from './sync/subscriber';
export { CONFIG_CHANNELS, type ConfigUpdateMessage } from './sync/channels';
```

### Step 8: Add Bot-Side Handlers (if needed) (30 min)

8. Verify bot subscribes to new channels. Check bot initialization:

```typescript
// In bot startup, ensure subscriber handles new channels
subscriber.on(CONFIG_CHANNELS.GIVEAWAY, async (message) => {
  const { guildId } = message;
  // Invalidate giveaway cache
  await giveawayService.reloadConfig(guildId);
});

subscriber.on(CONFIG_CHANNELS.TICKETS, async (message) => {
  const { guildId } = message;
  await ticketService.reloadConfig(guildId);
});

subscriber.on(CONFIG_CHANNELS.MUSIC, async (message) => {
  const { guildId } = message;
  await musicService.reloadConfig(guildId);
});
```

## Todo List

- [x] Add MUSIC channel to CONFIG_CHANNELS if missing (already existed)
- [x] Add publishGiveaway method to ConfigPublisher (already existed)
- [x] Add publishTickets method to ConfigPublisher (already existed)
- [x] Add publishMusic method to ConfigPublisher (already existed)
- [x] Add publishGiveawayUpdate wrapper in configSync.ts (already existed)
- [x] Add publishTicketsUpdate wrapper in configSync.ts (already existed)
- [x] Add publishMusicUpdate wrapper in configSync.ts (already existed)
- [x] Update Voice API route to call publisher (fixed - wrapped in try-catch)
- [x] Update Giveaway settings API route to call publisher (already correct)
- [x] Update Tickets API route to call publisher (already correct)
- [x] Verify package exports (confirmed)
- [ ] Test: Save voice settings, check Redis receives message (integration testing)
- [ ] Test: Save giveaway settings, check Redis receives message (integration testing)

## Success Criteria

1. **Publisher Methods Exist:** ConfigPublisher has Giveaway, Tickets, Music methods
2. **Wrapper Functions Exist:** configSync.ts exports all wrapper functions
3. **API Routes Call Publishers:** After DB save, Redis message is published
4. **Bot Receives Updates:** Bot logs show config update received
5. **No Request Failures:** Publisher errors are caught, don't break API response

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Redis connection failure | Low | Low | Catch errors, log, continue |
| Bot not subscribed to new channels | Medium | Low | Bot subscribes to all CONFIG_CHANNELS |
| Message format mismatch | Medium | Low | Use existing createConfigMessage helper |

## Security Considerations

- Redis messages contain only guildId and action type
- Sensitive data (tokens, keys) never included in messages
- Bot verifies guild membership before acting on config

## Next Steps

After this phase:
1. Proceed to Phase 4 for Bot -> Dashboard event sync
2. This enables dashboard to receive real-time updates when bot creates giveaways/tickets
