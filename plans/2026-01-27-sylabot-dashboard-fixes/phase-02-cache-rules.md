# Phase 02: Caching & Persistence Rules

> Parent: [plan.md](./plan.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 Critical |
| Effort | 1 hour |
| Files | 3-4 |

## Data Ownership Rules (Non-Negotiable)

```
┌──────────────────────────────────────────────────────────┐
│ 1. PostgreSQL = ONLY source of truth                     │
│ 2. Redis = Cache ONLY, never authoritative               │
│ 3. Bot MUST work correctly with empty Redis              │
│ 4. Dashboard writes → DB first, then invalidate cache    │
│ 5. Bot reads → Cache first, DB fallback (cache-aside)    │
└──────────────────────────────────────────────────────────┘
```

## Current State Analysis

**Good (keep as-is):**
- `SettingsCache.getOrFetch()` in `packages/config/src/cache.ts` — correct cache-aside pattern
- Dashboard API writes directly to PostgreSQL via Prisma
- `configSync.ts` publishes Redis Pub/Sub events

**Verify (may need fix):**
- Bot startup: Does it rely on Redis or DB?
- Bot Pub/Sub subscriber: Does it invalidate correctly?

## Implementation Steps

### Step 1: Verify Bot Startup Flow

**Check:** `apps/bot/src/index.ts`

Ensure startup does NOT require Redis:

```typescript
// ✅ CORRECT: DB-first startup
async function onReady() {
  for (const guild of client.guilds.cache.values()) {
    // Use cache-aside: DB as source, cache optional
    const settings = await settingsCache.getOrFetch(guild.id, 
      () => prisma.guildSettings.findUnique({ where: { guildId: guild.id } })
    );
  }
}
```

```typescript
// ❌ WRONG: Redis-first (breaks if Redis empty)
async function onReady() {
  const settings = await redis.get(`settings:${guildId}`);
  if (!settings) throw new Error('No settings!');
}
```

### Step 2: Dashboard → Bot Sync Flow

When dashboard saves settings:

```
Dashboard PATCH /api/guilds/:id/settings
    │
    ├─1─► Prisma: UPDATE guildSettings
    │
    ├─2─► Redis Pub/Sub: publish('config:settings', guildId)
    │
    └─3─► Return success to client
```

Bot receives Pub/Sub:

```
Bot subscribed to 'config:settings'
    │
    └──► settingsCache.invalidate(guildId)
         (Next read will fetch from DB via getOrFetch)
```

**File to verify:** `apps/dashboard/src/app/api/guilds/[guildId]/settings/route.ts`

Add Pub/Sub publish after successful write:

```typescript
// After Prisma upsert
await prisma.guildSettings.upsert({ ... });

// Publish invalidation event
await publishSettingsUpdate(guildId);  // Add this if missing

return ApiResponse.success(settings);
```

### Step 3: Bot Pub/Sub Subscriber

**File:** Check `apps/bot/src/lib/` for config subscriber

Ensure it properly invalidates cache:

```typescript
subscriber.subscribe('config:settings');

subscriber.on('message', (channel, guildId) => {
  if (channel === 'config:settings') {
    settingsCache.invalidate(guildId);
    logger.debug(`Cache invalidated for guild ${guildId}`);
  }
});
```

### Step 4: Redis Failure Behavior

Bot MUST handle Redis unavailability:

```typescript
// In SettingsCache.getOrFetch (already implemented correctly)
async getOrFetch<T>(guildId: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await this.get<T>(guildId);
  if (cached !== null) return cached;
  
  // Cache miss or Redis error → fetch from DB
  const data = await fetcher();  // ← This is the safety net
  
  this.set(guildId, data).catch(() => {});  // Silent fail OK
  return data;
}
```

## Persistence After Restart — Verification

| Scenario | Expected Behavior |
|----------|-------------------|
| PM2 restart with Redis up | Settings load from cache, fallback to DB |
| PM2 restart with Redis down | Settings load from DB only (slower but correct) |
| Dashboard edit → restart | Settings persist (DB is source of truth) |

## Files to Verify/Modify

| File | Action |
|------|--------|
| `apps/bot/src/index.ts` | Verify DB-first startup |
| `apps/bot/src/lib/config-subscriber.ts` | Verify cache invalidation |
| `apps/dashboard/src/app/api/.../settings/route.ts` | Add Pub/Sub if missing |
| `packages/config/src/sync/publisher.ts` | Verify publish methods exist |

## Success Criteria

- [ ] Bot starts correctly with empty Redis
- [ ] Dashboard edit → Bot sees change within 5s
- [ ] PM2 restart → Settings persist
- [ ] Redis failure → Bot still works (slower)
