# Code Review: Graceful Shutdown & Discord Bot Edge Cases

## Scope
- **Files reviewed**: 3 files
  - apps/bot/src/index.ts
  - apps/manager/src/index.ts
  - apps/bot/src/commands/moderation/ban.ts
- **Lines analyzed**: ~360 lines
- **Focus**: Graceful shutdown, error handling, Discord API edge cases
- **Review date**: 2026-01-30

---

## Overall Assessment

**Critical shutdown & error handling deficiencies found.** Bot/manager graceful shutdown flows have **empty catch blocks** that silently swallow errors, **missing await on async operations**, and **no double-signal protection**. Discord command has **unsafe null assertions** and **uses deprecated API**.

---

## Critical Issues

### 1. **Empty Catch Blocks Hide Shutdown Failures** ❌ UNHANDLED
**Location**: `apps/bot/src/index.ts:81-118`

**Problem**: All shutdown cleanup operations wrapped in empty catch blocks
```typescript
// Lines 78-118
try {
  await stopHealthServer();
} catch {
  // Ignore  ← SILENT FAILURE
}

try {
  await stopConfigSync();
} catch {
  // Ignore  ← SILENT FAILURE
}

// ... 4 more empty catches
```

**Impact**:
- Resource leaks undetected (Redis connections, DB pools, HTTP servers)
- Cascading failures hidden during shutdown
- Cannot debug production shutdown issues
- May cause zombie processes/connections

**Recommendation**:
```typescript
try {
  await stopHealthServer();
} catch (err) {
  logger.warn(`${tenantLabel} Failed to stop health server:`, err);
}
```

---

### 2. **HTTP Server Close Not Awaited** ❌ UNHANDLED
**Location**: `apps/manager/src/index.ts:128`

**Problem**: `server.close()` is async but not awaited
```typescript
// Line 128
server.close();  // ← Returns void, but internally async
```

**Impact**:
- Process may exit before all connections closed
- Active HTTP requests aborted mid-flight
- Client receives incomplete responses

**Recommendation**:
```typescript
await new Promise<void>((resolve, reject) => {
  server.close((err) => {
    if (err) {
      logger.error('Failed to close HTTP server:', err);
      reject(err);
    } else {
      logger.info('HTTP server closed');
      resolve();
    }
  });
});
```

---

### 3. **Double Shutdown Signal Handling** ❌ UNHANDLED
**Location**:
- `apps/bot/src/index.ts:126-127`
- `apps/manager/src/index.ts:137-138`

**Problem**: No protection against concurrent SIGINT/SIGTERM
```typescript
// Both files
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// ← Can trigger shutdown() twice if both signals sent
```

**Impact**:
- Concurrent `process.exit(0)` calls
- Double-disconnect on Redis/DB (may corrupt state)
- Race conditions in cleanup logic

**Recommendation**:
```typescript
let isShuttingDown = false;

async function shutdown() {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal');
    return;
  }
  isShuttingDown = true;

  // ... existing shutdown logic
}
```

---

### 4. **Guild Null Assertion Unsafe** ❌ UNHANDLED
**Location**: `apps/bot/src/commands/moderation/ban.ts:36, 49, 73-74`

**Problem**: `interaction.guild!` unsafe if command runs in DM context
```typescript
// Line 36
const target = interaction.guild!.members.cache.get(user.id);

// Line 49-50
const result = await ModerationService.ban(
  interaction.guild!,  // ← Runtime error if null
  // ...
);

// Line 74
await LoggingService.sendModLog(interaction.guild!, embed);
```

**Impact**:
- Runtime crash if command somehow invoked in DM
- Bot process may restart due to unhandled exception
- Although `setDefaultMemberPermissions` should prevent this, defense-in-depth missing

**Recommendation**:
```typescript
async execute(interaction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in servers.',
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild; // Now safely typed
  // ... rest of code
}
```

---

## High Priority Findings

### 5. **Redis Disconnect Without Cleanup** ⚠️ PARTIAL
**Location**: `apps/bot/src/index.ts:113-118`

**Problem**: `redis.disconnect()` may have pending operations
```typescript
try {
  redis.disconnect();  // ← Sync call, but may have queued cmds
  logger.info(`${tenantLabel} Redis disconnected`);
} catch {
  // Ignore
}
```

**Current state**: Uses synchronous disconnect
**Missing**:
- No check for pending commands via `redis.status`
- No graceful `quit()` before `disconnect()`

**Recommendation**:
```typescript
try {
  await redis.quit(); // Graceful: waits for pending commands
  logger.info(`${tenantLabel} Redis disconnected`);
} catch (err) {
  logger.warn(`${tenantLabel} Redis quit failed, forcing disconnect:`, err);
  redis.disconnect(); // Fallback force disconnect
}
```

---

### 6. **User.tag Deprecated** ❌ UNHANDLED
**Location**: `apps/bot/src/commands/moderation/ban.ts:66, 67`

**Problem**: `user.tag` deprecated in discord.js v14.5+
```typescript
// Line 66
{ name: 'User', value: `${user.tag}`, inline: true },
// Line 67
{ name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
```

**Impact**:
- May be removed in future discord.js versions
- Console deprecation warnings

**Recommendation**:
```typescript
{ name: 'User', value: `${user.username}#${user.discriminator}`, inline: true },
// Or modern format:
{ name: 'User', value: user.displayName, inline: true },
```

---

## Medium Priority Improvements

### 7. **Target Member Not in Cache** ✅ HANDLED (but can improve)
**Location**: `apps/bot/src/commands/moderation/ban.ts:36`

**Current implementation**:
```typescript
const target = interaction.guild!.members.cache.get(user.id);

// If member is in server, check hierarchy
if (target && !ModerationService.canModerate(moderator, target)) {
  // ... error
}
```

**Status**: ✅ Partially handled
- Code correctly handles `target === undefined` case (member not cached)
- Ban still proceeds even if member not in cache (correct for off-server bans)

**Improvement**: Could fetch member explicitly to guarantee hierarchy check
```typescript
let target: GuildMember | null = interaction.guild.members.cache.get(user.id) ?? null;

// Fetch if not cached (ensures accurate hierarchy check)
if (!target) {
  try {
    target = await interaction.guild.members.fetch(user.id);
  } catch {
    // User not in server - ban will still work
  }
}

if (target && !ModerationService.canModerate(moderator, target)) {
  // ...
}
```

---

### 8. **Redis Connection Retry Exhausted** ⚠️ PARTIAL
**Location**: `apps/bot/src/index.ts:38-48`

**Current implementation**:
```typescript
const redisConnected = await connectRedis();
if (!redisConnected) {
  logger.warn(`${tenantLabel} Running without Redis - some features may be limited`);
} else {
  // Initialize Redis-dependent features
}
```

**Status**: ⚠️ Partial
- Bot continues without Redis (good for resilience)
- Warning logged (good for observability)

**Missing**:
- No health check impact report (does `/health` endpoint reflect Redis down?)
- No attempt to reconnect during runtime

**Check health endpoint**:
Verify `/health` endpoint (line 54-57) reports Redis status

**Recommendation**:
```typescript
// In health check response
{
  status: redisConnected ? 'healthy' : 'degraded',
  redis: redisConnected ? 'connected' : 'unavailable',
  features: {
    configSync: redisConnected,
    dashboardCommands: redisConnected
  }
}
```

---

## Low Priority Suggestions

### 9. **Shutdown Timeout Missing**
**Both files**: No forced exit timeout if graceful shutdown hangs

**Recommendation**:
```typescript
async function shutdown() {
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000); // 30s timeout

  // ... existing shutdown logic

  clearTimeout(shutdownTimeout);
  process.exit(0);
}
```

---

### 10. **Client.destroy() Not Awaited**
**Location**: `apps/bot/src/index.ts:120`

**Current**:
```typescript
client.destroy();
```

**Recommendation**:
```typescript
await client.destroy(); // Waits for WS close
```

---

## Positive Observations

✅ **Good practices found**:
- IPC shutdown integration (line 23)
- Health server startup gated by port config (line 54-57)
- Database connection failures exit immediately (line 35)
- Moderation hierarchy checks implemented (ban.ts:39)
- Deferred replies prevent timeout (ban.ts:47)
- Auto-start bot recovery after manager restart (manager/index.ts:89-115)

---

## Recommended Actions

### **Priority 1 (Critical - Implement Now)**
1. **Add logging to all catch blocks** (bot/index.ts:81-118, manager/index.ts same pattern)
   - Replace `catch {}` with `catch (err) { logger.warn(...) }`
2. **Await server.close()** (manager/index.ts:128)
   - Wrap in promise to ensure graceful HTTP shutdown
3. **Add shutdown guard** (both files)
   - Prevent double shutdown with `isShuttingDown` flag
4. **Remove guild null assertions** (ban.ts:36, 49, 74)
   - Add explicit null check at function start

### **Priority 2 (High - Implement This Week)**
5. **Use redis.quit() instead of disconnect()** (bot/index.ts:114)
   - Graceful Redis shutdown with pending command wait
6. **Replace user.tag with modern API** (ban.ts:66-67)
   - Migrate to `user.username` or `user.displayName`

### **Priority 3 (Medium - Plan for Next Sprint)**
7. **Fetch member explicitly for hierarchy check** (ban.ts:36)
   - Guarantee accurate role hierarchy validation
8. **Report Redis status in health endpoint**
   - Add degraded state when Redis unavailable

### **Priority 4 (Low - Technical Debt)**
9. **Add shutdown timeout guard**
10. **Await client.destroy()**

---

## Metrics
- **Critical Issues**: 4 (shutdown errors, HTTP close, double signal, null assertions)
- **High Priority**: 2 (Redis cleanup, deprecated API)
- **Medium Priority**: 2 (member fetch, health reporting)
- **Low Priority**: 2 (timeouts, await client destroy)
- **Positive Practices**: 6 identified

---

## Unresolved Questions

1. Does health endpoint (`/health`) currently report Redis connection status?
2. What's the expected behavior if manager receives SIGTERM while bots still starting?
3. Are there integration tests covering shutdown scenarios?
4. Does ModerationService.ban() handle off-server user bans correctly (when target is undefined)?
5. What's the restart policy for bot processes (systemd, docker, pm2)?
