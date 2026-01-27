# 500 Internal Server Errors Analysis - SylaBot Dashboard

## Summary

Multiple API routes throwing 500 errors. Root cause: database connection issues or token resolution failures that propagate as uncaught exceptions.

## Identified Root Causes

### 1. Database Connection Issues (HIGH PRIORITY)

- All API routes use `@repo/database` prisma client directly
- **No connection pooling validation** before queries
- Large parallel queries in `/stats/route.ts` (17 parallel Prisma calls) can exhaust connection pool
- No retry logic for transient database errors

### 2. Token Resolution Failures (MEDIUM PRIORITY)

**File:** `apps/dashboard/src/lib/tenant-token.ts`

Issues:

- Line 59-60: `getEncryptionService().decrypt()` can throw if ENCRYPTION_KEY missing
- Fallback to `process.env.DISCORD_TOKEN` returns null if unset, causing downstream 500s
- No validation that decrypted token is valid before caching

### 3. Generic Error Handling Pattern (HIGH PRIORITY)

All routes follow same pattern:

```typescript
try { ... }
catch (error) {
  logger.error(`Failed: ${error}`);
  return NextResponse.json({ error: 'Failed' }, { status: 500 });
}
```

Problems:

- No distinction between client errors (400) vs server errors (500)
- Missing validation before database calls
- No specific error codes for debugging

## Affected Routes (from grep analysis)

| Route                          | Error Type   | Specific Issue                            |
| ------------------------------ | ------------ | ----------------------------------------- |
| `/guilds/[guildId]/stats`      | DB + Discord | 17 parallel queries, Discord API failures |
| `/guilds/[guildId]/voice`      | DB           | Missing settings validation               |
| `/guilds/[guildId]/leveling`   | DB           | Complex aggregation queries               |
| `/guilds/[guildId]/messages`   | DB           | Template fetching                         |
| `/guilds/[guildId]/moderation` | DB           | Likely modLog queries                     |

## Code Locations Needing Fixes

### 1. stats/route.ts (Lines 19-99)

```typescript
// ISSUE: Promise.all fails entirely if any promise rejects
const [discordData, dbStats] = await Promise.all([
  fetchDiscordGuildData(guildId), // Can fail
  fetchDatabaseStats(guildId), // 17 parallel DB calls
]);
```

### 2. tenant-token.ts (Lines 58-61)

```typescript
// ISSUE: No try-catch around decryption
const encryptionService = getEncryptionService();
const decryptedToken = encryptionService.decrypt(tenant.discordToken);
```

### 3. All route handlers - Missing input validation

- No guildId format validation (should be snowflake)
- No session/auth check before heavy DB operations

## Recommended Fixes

### Immediate (P0)

1. **Add Promise.allSettled wrapper** for parallel DB queries:

```typescript
const [discordResult, dbResult] = await Promise.allSettled([...]);
if (dbResult.status === 'rejected') {
  return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
}
```

2. **Validate guildId format** before DB calls:

```typescript
if (!/^\d{17,19}$/.test(guildId)) {
  return NextResponse.json({ error: 'Invalid guild ID' }, { status: 400 });
}
```

3. **Wrap encryption in try-catch** in tenant-token.ts:

```typescript
try {
  const decryptedToken = encryptionService.decrypt(tenant.discordToken);
} catch (decryptError) {
  logger.error(`Token decryption failed: ${decryptError}`);
  return process.env.DISCORD_TOKEN || null;
}
```

### Short-term (P1)

4. **Add database health check middleware**
5. **Reduce parallel queries** in stats route - batch similar queries
6. **Add specific error types** for better debugging

### Medium-term (P2)

7. **Implement connection pool monitoring**
8. **Add circuit breaker** for Discord API calls
9. **Create unified error response helper**

## Environment Variables to Check

```bash
ENCRYPTION_KEY         # Required for token decryption
DISCORD_TOKEN          # Fallback bot token
DATABASE_URL           # Prisma connection string
DIRECT_URL             # Prisma direct connection
```

## Logger Implementation Notes

- Uses structured logger imported from `@/lib/logger`
- Logs error as string interpolation, loses stack trace
- Recommendation: Pass error object directly for full context

## Unresolved Questions

1. Is the database connection pooling configured appropriately for the query volume?
2. Are there any recent schema changes that might cause query failures?
3. Is Redis (used in some routes) available and connected?
4. What's the current Prisma connection limit vs concurrent dashboard users?
5. Are there any specific guild IDs consistently failing?

## Next Steps

1. Check application logs for specific error messages
2. Verify all env vars are set in production
3. Add database connection health endpoint
4. Implement input validation middleware
