# Next.js App Router API Patterns for Discord Bot Data Proxying

## Current Implementation Analysis

### Existing Pattern (channels/roles routes)

```typescript
// Route structure: /api/guilds/[guildId]/channels
export async function GET(request, { params }) {
  const { guildId } = await params;
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const data = await discordService.getGuildChannels(guildId);
    return ApiResponse.success(transformedData);
  } catch (error) {
    logger.error(`API_CHANNELS error: ${error}`);
    return ApiResponse.serverError('Failed to fetch channels');
  }
}
```

**Issues Identified:**

- No caching - every request hits Discord API directly
- No rate limit handling for Discord 429 responses
- Error messages don't distinguish Discord API failures from internal errors

---

## Recommended Patterns

### 1. Server-Side Data Fetching with Caching

**Option A: Next.js fetch() with revalidate (Recommended)**

```typescript
// lib/discord.ts - Add caching to fetch
async function fetchDiscord(endpoint: string, options?: RequestInit & { revalidate?: number }) {
  const res = await fetch(`${DISCORD_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: options?.revalidate ?? 30 }, // 30s default
  });

  if (!res.ok) {
    throw new DiscordApiError(res.status, await res.text());
  }
  return res.json();
}
```

**Option B: Route-level cache headers**

```typescript
export async function GET(request, { params }) {
  // ... fetch data ...
  return NextResponse.json(
    { success: true, data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
```

### 2. Error Handling Pattern

```typescript
// lib/errors.ts
export class DiscordApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Discord API ${status}: ${body}`);
    this.name = 'DiscordApiError';
  }

  isRateLimited() {
    return this.status === 429;
  }
  isNotFound() {
    return this.status === 404;
  }
  isForbidden() {
    return this.status === 403;
  }
}

// Route handler
try {
  const data = await discordService.getGuildChannels(guildId);
  return ApiResponse.success(data);
} catch (error) {
  if (error instanceof DiscordApiError) {
    if (error.isRateLimited()) {
      return ApiResponse.tooManyRequests('Discord rate limited. Retry later.');
    }
    if (error.isNotFound()) {
      return ApiResponse.notFound('Guild not found in Discord');
    }
    if (error.isForbidden()) {
      return ApiResponse.forbidden('Bot lacks guild access');
    }
  }
  logger.error(`Discord fetch failed: ${error}`);
  return ApiResponse.serverError('Failed to fetch Discord data');
}
```

### 3. Dual-Source Pattern (Bot Manager + Discord API)

For hybrid approach when bot manager provides data:

```typescript
// lib/discord-data.ts
export async function getGuildChannels(guildId: string) {
  // Try bot manager first (faster, no rate limits)
  try {
    const botManagerUrl = process.env.BOT_MANAGER_URL;
    const res = await fetch(`${botManagerUrl}/guilds/${guildId}/channels`, {
      next: { revalidate: 10 },
    });
    if (res.ok) return res.json();
  } catch (e) {
    logger.warn('Bot manager unavailable, falling back to Discord API');
  }

  // Fallback to Discord API
  return discordService.getGuildChannels(guildId);
}
```

### 4. Cache Key Pattern for Dynamic Routes

```typescript
// For client-side: use SWR/React Query keys
const { data } = useSWR(`/api/guilds/${guildId}/channels`, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 30000, // 30s
});

// For server components: use unstable_cache
import { unstable_cache } from 'next/cache';

const getCachedChannels = unstable_cache(
  async (guildId: string) => discordService.getGuildChannels(guildId),
  ['guild-channels'],
  { revalidate: 30, tags: [`guild-${guildId}`] }
);
```

---

## Recommended Cache Durations

| Data Type  | Revalidate | Rationale            |
| ---------- | ---------- | -------------------- |
| Channels   | 30-60s     | Changes infrequently |
| Roles      | 30-60s     | Changes infrequently |
| Guild Info | 60-120s    | Static metadata      |
| Members    | 10-30s     | More dynamic         |
| Messages   | No cache   | Real-time data       |

---

## Implementation Checklist

1. [ ] Add `DiscordApiError` class for typed error handling
2. [ ] Update `fetchDiscord()` with `next: { revalidate }` option
3. [ ] Add rate limit detection and proper 429 responses
4. [ ] Update routes to pass revalidate config
5. [ ] Consider `unstable_cache` for server component data

---

## Key Takeaways

1. **Use Next.js native caching** - `fetch()` with `next: { revalidate }` is simplest
2. **Distinguish error types** - Custom error class enables proper HTTP status mapping
3. **30s is sweet spot** - Balances freshness vs API rate limits for Discord data
4. **Bot manager fallback** - Reduces Discord API dependency when available
