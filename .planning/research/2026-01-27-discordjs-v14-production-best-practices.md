# Discord.js v14 Production Best Practices (2024-2026)

**Date:** 2026-01-27 | **Status:** Researched | **Sources:** discord.js official docs, discordjs.guide, codebase analysis

---

## 1. Multi-Tenant Architecture Patterns

### Best Practices

- **Process isolation:** Each tenant runs in separate Node.js process via `fork()`. Your `BotSpawner` implementation is correct
- **Env-based config:** Pass tenant-specific vars (`TENANT_ID`, `DATABASE_URL`, `REDIS_PREFIX`) via env - never hardcode
- **Token security:** Decrypt tokens at spawn-time only, never log/store plaintext. Your `getEncryptionService()` pattern is solid
- **Health monitoring:** Each tenant should have IPC health reporting; disable individual HTTP health ports (you do: `HEALTH_PORT=0`)

### Recommended Pattern (existing in your codebase)

```typescript
const child = fork(botEntryPoint, [], {
  env: { TENANT_ID, DISCORD_TOKEN: decryptedToken, DATABASE_URL, REDIS_PREFIX },
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  detached: false,
});
```

### Pitfalls

- ❌ Sharing single PrismaClient across tenants (connection pool exhaustion)
- ❌ Not sanitizing tenant IDs in DB schema names (SQL injection risk)
- ❌ Auto-restart without exponential backoff (crash loops)

---

## 2. Sharding Strategies

### When to Shard

- **Required at 2,500 guilds** (Discord enforces this). Plan at ~2,000 guilds
- `ShardingManager` spawns separate processes per shard
- `shards: 'auto'` for internal sharding (not recommended for production - high memory)

### Best Practices

- Use `ShardingManager` for cross-shard communication via `broadcastEval()` and `fetchClientValues()`
- For multi-machine: implement custom shard orchestration with Redis for state sync

```typescript
// Cross-shard guild count
const results = await client.shard.fetchClientValues('guilds.cache.size');
const totalGuilds = results.reduce((acc, count) => acc + count, 0);
```

### Multi-Tenant + Sharding

- Each tenant bot can independently shard when needed
- Use `ShardingManager` per tenant in manager service, not global sharding

---

## 3. Database Integration (Prisma + PostgreSQL)

### Best Practices

- **Schema-per-tenant isolation:** Your `appendSchemaToUrl()` is correct pattern
- **Connection pooling:** Use PgBouncer in production (Prisma default 5 connections/client)
- **Cache tenant clients:** Your `tenantClients` Map prevents connection spam
- **Logging:** `['error']` in prod, `['query', 'error', 'warn']` in dev

### Recommended Pattern

```typescript
export function createTenantPrisma(tenantId: string): PrismaClient {
  const schemaUrl = appendSchemaToUrl(baseUrl, `tenant_${sanitize(tenantId)}`);
  return new PrismaClient({ datasources: { db: { url: schemaUrl } } });
}
```

### Pitfalls

- ❌ Not calling `$disconnect()` on shutdown (zombie connections)
- ❌ Creating new client per request (use caching)
- ❌ Missing transaction timeouts (add `transaction: { timeout: 10000 }`)

---

## 4. Redis Pub/Sub for Real-Time Sync

### Best Practices

- **Separate subscriber connection:** Redis pub/sub uses blocking connection. Your pattern is correct
- **Structured messages:** Use typed `ConfigUpdateMessage` for type safety
- **Module-specific invalidation:** Granular cache invalidation (your `cacheInvalidators` pattern)
- **Graceful disconnect:** Always `subscriber.disconnect()` on shutdown

### Recommended Pattern

```typescript
// Publisher (dashboard)
await publisher.publish(
  'config:update',
  JSON.stringify({ guildId, module: 'WELCOME', action: 'UPDATE' })
);

// Subscriber (bot) - your existing pattern
subscriber.onAny(async ({ guildId, module }) => {
  await cacheInvalidators[module]?.(guildId);
});
```

### Pitfalls

- ❌ Using same Redis client for pub/sub and cache (subscriber blocks)
- ❌ Not handling reconnection (use `retryStrategy`)
- ❌ Missing `lazyConnect: true` for graceful startup failures

---

## 5. Error Handling & Graceful Shutdown

### Best Practices

- **Ordered shutdown:** Stop health server → unsubscribe Redis → disconnect DB → destroy client
- **IPC shutdown:** Send `{ type: 'shutdown' }` to child, force kill after timeout
- **Error boundaries:** Catch and reply to user, log to dev channel

### Recommended Shutdown Order (matches your implementation)

```typescript
async function shutdown() {
  await stopHealthServer();
  await stopConfigSync();
  await prisma.$disconnect();
  redis.disconnect();
  client.destroy();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### Pitfalls

- ❌ `process.exit()` without cleanup (data loss)
- ❌ Not handling `uncaughtException` (always log then exit)
- ❌ Silent swallow of Redis disconnect errors

---

## 6. Rate Limiting & Anti-Abuse

### Best Practices

- **Redis-based sliding window:** Your INCR + EXPIRE pattern is correct
- **Layered limits:** API access (100/min), operations (20/hr), credential changes (5/hr)
- **Graceful degradation:** Allow request if Redis fails (your implementation does this)
- **Headers:** Return `X-RateLimit-*` headers for client awareness

### Recommended Limits

| Action             | Limit | Window   |
| ------------------ | ----- | -------- |
| API access         | 100   | 1 min    |
| Bot operations     | 20    | 1 hour   |
| Tenant creation    | 3     | 24 hours |
| Credential updates | 5     | 1 hour   |
| Commands per user  | 10    | 10 sec   |

### Anti-Abuse Additions

```typescript
// Add command-level rate limiting
export async function canExecuteCommand(
  userId: string,
  commandName: string
): Promise<RateLimitResult> {
  return checkRateLimit(`cmd:${commandName}:${userId}`, 5, 60); // 5 per minute
}

// Guild-level abuse detection
export async function detectAbusePattern(guildId: string): Promise<boolean> {
  const key = `abuse:${guildId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count > 50; // 50 actions/minute = potential abuse
}
```

---

## Summary: Your Codebase Assessment

| Area           | Status            | Notes                                          |
| -------------- | ----------------- | ---------------------------------------------- |
| Multi-tenant   | ✅ Good           | Process isolation, token encryption, IPC       |
| Sharding       | ⚠️ Not needed yet | Implement when approaching 2,000 guilds/tenant |
| Database       | ✅ Good           | Schema isolation, client caching               |
| Redis sync     | ✅ Good           | Typed messages, granular invalidation          |
| Error handling | ✅ Good           | Ordered shutdown, dev logging                  |
| Rate limiting  | ⚠️ Expand         | Add command-level limits, abuse detection      |

---

## Sources

- [discord.js Sharding Guide](https://discordjs.guide/sharding/) (discordjs.guide)
- [discord.js Documentation](https://discord.js.org/docs/packages/discord.js/main) (v14)
- [Discord API Gateway Docs](https://discord.com/developers/docs/topics/gateway#sharding)
- Codebase analysis: `apps/bot/src/index.ts`, `apps/manager/src/spawner.ts`, `packages/security/src/ratelimit.ts`
