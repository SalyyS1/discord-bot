# Discord Bot Dashboard API Patterns

**Date:** 2026-01-28 | **Status:** Researched | **Focus:** Fetching real Discord data in web dashboards

---

## 1. Architecture: Dashboard ↔ Bot Communication

### Pattern A: Direct Discord API (Current in codebase)

Dashboard calls Discord REST API directly using bot token stored in DB.

```typescript
// apps/dashboard/src/app/api/guilds/[guildId]/channels/route.ts pattern
const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
  headers: { Authorization: `Bot ${botToken}` },
});
```

**Pros:** Simple, no IPC needed
**Cons:** Token exposure risk in dashboard, rate limits shared with bot

### Pattern B: Bot IPC Proxy (Recommended for multi-tenant)

Dashboard → Manager → Bot IPC → discord.js cache

```typescript
// apps/bot/src/lib/ipc.ts - existing pattern
process.on('message', async (msg: IPCMessage) => {
  if (msg.type === 'getGuildData') {
    const guild = client.guilds.cache.get(msg.guildId);
    process.send({
      channels: guild.channels.cache.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      roles: guild.roles.cache.map((r) => ({ id: r.id, name: r.name, color: r.color })),
    });
  }
});
```

**Pros:** Uses cached data, no extra API calls, token stays in bot
**Cons:** Requires IPC infrastructure

---

## 2. Discord.js Methods for Guild Data

### Channels

```typescript
// Get all channels (from cache - instant)
const channels = guild.channels.cache;

// Get specific channel types
const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice);
const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory);

// Force fetch from API (bypasses cache)
const freshChannels = await guild.channels.fetch();
```

### Roles

```typescript
// Get all roles (from cache)
const roles = guild.roles.cache;

// Filter manageable roles (bot can assign)
const manageable = guild.roles.cache.filter((r) => r.editable && !r.managed);

// Get @everyone
const everyone = guild.roles.everyone;
```

### Members

```typescript
// Single member fetch (from cache or API)
const member = await guild.members.fetch(userId);

// Fetch all members (requires GUILD_MEMBERS intent)
await guild.members.fetch();
const members = guild.members.cache;

// Chunk-based fetch for large guilds
guild.members.fetch({ limit: 100, after: lastMemberId });
```

---

## 3. Caching Strategies

### Layer 1: Discord.js Internal Cache

- Channels, roles: cached on READY, updated via gateway events
- Members: cached on demand (unless GUILD_MEMBERS intent + fetchAll)
- Messages: capped at 200 per channel by default

### Layer 2: Redis Cache (Dashboard-side)

```typescript
// Pattern for dashboard API routes
async function getGuildChannels(guildId: string, botToken: string) {
  const cacheKey = `guild:${guildId}:channels`;

  // Check Redis first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from Discord
  const data = await fetchDiscordAPI(`/guilds/${guildId}/channels`, botToken);

  // Cache for 5 minutes (channels rarely change)
  await redis.setex(cacheKey, 300, JSON.stringify(data));
  return data;
}
```

### Cache Invalidation

```typescript
// Bot-side: publish on channel create/update/delete
client.on(Events.ChannelCreate, (channel) => {
  redis.publish(
    'config:update',
    JSON.stringify({
      guildId: channel.guild.id,
      module: 'CHANNELS',
      action: 'INVALIDATE',
    })
  );
});
```

### Recommended TTLs

| Data Type  | TTL    | Reason        |
| ---------- | ------ | ------------- |
| Channels   | 5 min  | Rarely change |
| Roles      | 5 min  | Rarely change |
| Members    | 1 min  | More dynamic  |
| Guild info | 15 min | Very stable   |

---

## 4. Discord OAuth2 Flow

### Dashboard Auth Flow

```
1. User clicks "Login with Discord"
2. Redirect to: discord.com/oauth2/authorize?client_id=X&redirect_uri=Y&scope=identify+guilds
3. Discord redirects back with ?code=Z
4. Exchange code for access_token + refresh_token
5. Fetch /users/@me for user info
6. Fetch /users/@me/guilds for mutual guilds (filter by permissions)
```

### Required Scopes

- `identify`: Basic user info
- `guilds`: List user's guilds (check if bot is there)
- `guilds.members.read`: Detailed member info (optional)

### Bot Presence Check

```typescript
// Dashboard: check if bot is in user's guild
const userGuilds = await fetchDiscordAPI('/users/@me/guilds', userAccessToken);
const botGuildIds = await getBotGuildIds(); // from IPC or bot token

const mutualGuilds = userGuilds.filter(
  (g) => botGuildIds.includes(g.id) && (BigInt(g.permissions) & BigInt(0x20)) !== 0n // MANAGE_GUILD permission
);
```

---

## 5. Existing Codebase Patterns

### Current API Routes Found

- `apps/dashboard/src/app/api/guilds/[guildId]/channels/route.ts`
- `apps/dashboard/src/app/api/guilds/[guildId]/roles/route.ts`

### IPC Pattern (apps/bot/src/lib/ipc.ts)

```typescript
// Reports guild stats back to manager
guilds: client.guilds.cache.size;
```

### Dashboard Commands (apps/bot/src/lib/dashboardCommands.ts)

```typescript
// Bot receives commands from dashboard via IPC
const guild = client.guilds.cache.get(guildId);
const channel = (await guild.channels.fetch(channelId)) as TextChannel;
```

---

## 6. Implementation Recommendations

### For Current Issue (Fetching Real Channels/Roles)

**Option 1: Direct API Call (Simplest)**

```typescript
// In API route
const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
  headers: { Authorization: `Bot ${tenant.botToken}` },
});
const channels = await res.json();
```

**Option 2: IPC Request (Better for multi-tenant)**

```typescript
// Dashboard → Manager → Bot
const response = await sendIPCRequest(tenantId, 'getGuildData', { guildId });
return response.channels;
```

### Rate Limit Awareness

- Discord API: 50 requests/second globally
- Use `X-RateLimit-*` headers to track
- Implement exponential backoff on 429

---

## Unresolved Questions

1. Current channels/roles API routes - are they using mock data or real Discord API?
2. Is there IPC infrastructure for dashboard→bot queries, or only bot→manager reports?
3. Which approach preferred: direct Discord API or IPC proxy?

---

## Sources

- discord.js docs: https://discord.js.org/docs/packages/discord.js/main
- Discord API: https://discord.com/developers/docs/resources/guild
- Codebase: apps/bot/src/lib/ipc.ts, apps/bot/src/lib/dashboardCommands.ts
