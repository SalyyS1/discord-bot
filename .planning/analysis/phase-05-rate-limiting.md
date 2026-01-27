# Phase 05: Rate Limiting Enhancement

**Date:** 2026-01-27 | **Priority:** Low | **Status:** Pending

---

## Context

Current rate limiting is at API/operation level. Missing command-level rate limits and abuse detection patterns.

---

## Overview

| Metric           | Value     |
| ---------------- | --------- |
| New Features     | 2         |
| Estimated Effort | 2-3 hours |
| Risk Level       | Low       |

---

## Key Insights

From research:

- Current: API access (100/min), operations (20/hr), credential changes (5/hr)
- Missing: Command-level limits per user, abuse detection per guild

---

## Enhancement 1: Command-Level Rate Limiting

### Current State

No per-command rate limiting. Users can spam commands.

### Solution

```typescript
// packages/security/src/ratelimit.ts

/**
 * Check if user can execute a command
 * @returns RateLimitResult with allowed status and retry info
 */
export async function canExecuteCommand(
  userId: string,
  commandName: string,
  limit: number = 5,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:cmd:${commandName}:${userId}`;
  return checkRateLimit(key, limit, windowSeconds);
}

/**
 * Command-specific limits (defaults can be overridden)
 */
export const COMMAND_LIMITS: Record<string, { limit: number; window: number }> = {
  rank: { limit: 3, window: 30 }, // Rank card generation is expensive
  leaderboard: { limit: 2, window: 30 }, // DB-heavy query
  suggest: { limit: 3, window: 60 }, // Prevent spam
  giveaway: { limit: 5, window: 300 }, // Prevent giveaway spam
  default: { limit: 10, window: 60 }, // Default for all commands
};
```

### Integration in interactionCreate.ts

```typescript
// apps/bot/src/events/interactionCreate.ts
import { canExecuteCommand, COMMAND_LIMITS } from '@repo/security';

if (interaction.isChatInputCommand()) {
  const cmdName = interaction.commandName;
  const limits = COMMAND_LIMITS[cmdName] ?? COMMAND_LIMITS['default'];

  const { allowed, retryAfter } = await canExecuteCommand(
    interaction.user.id,
    cmdName,
    limits.limit,
    limits.window
  );

  if (!allowed) {
    return interaction.reply({
      content: `Slow down! Try again in ${retryAfter} seconds.`,
      ephemeral: true,
    });
  }

  // Continue with command execution
}
```

---

## Enhancement 2: Guild Abuse Detection

### Purpose

Detect abnormal activity patterns per guild (potential abuse/scripted attacks).

### Solution

```typescript
// packages/security/src/abuse-detection.ts
import { redis } from '@repo/database';

const ABUSE_THRESHOLD = 50; // Actions per minute
const WINDOW_SECONDS = 60;

/**
 * Track guild activity and detect potential abuse
 */
export async function trackGuildActivity(
  guildId: string,
  action: string
): Promise<{ isAbuse: boolean; count: number }> {
  const key = `abuse:${guildId}:${action}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    return {
      isAbuse: count > ABUSE_THRESHOLD,
      count,
    };
  } catch {
    // Redis failure - allow through (graceful degradation)
    return { isAbuse: false, count: 0 };
  }
}

/**
 * Check if guild is currently flagged for abuse
 */
export async function isGuildFlagged(guildId: string): Promise<boolean> {
  const key = `abuse:flag:${guildId}`;
  return (await redis.get(key)) === '1';
}

/**
 * Flag guild for abuse (triggers alert)
 */
export async function flagGuildForAbuse(
  guildId: string,
  reason: string,
  durationSeconds: number = 3600
): Promise<void> {
  const key = `abuse:flag:${guildId}`;
  await redis.setex(key, durationSeconds, '1');

  // Log for monitoring
  logger.warn('Guild flagged for abuse', { guildId, reason });

  // TODO: Send alert to monitoring channel
}
```

---

## Implementation Steps

### Step 1: Add Command Rate Limiting

1. Create `canExecuteCommand` in `@repo/security`
2. Add `COMMAND_LIMITS` configuration
3. Update `interactionCreate.ts` to check limits

### Step 2: Add Abuse Detection

1. Create `abuse-detection.ts` in `@repo/security`
2. Track activity in high-volume event handlers:
   - `messageCreate`
   - `interactionCreate`
   - Ticket creation
3. Add auto-flag when threshold exceeded

### Step 3: Add Rate Limit Headers to API

```typescript
// apps/dashboard/src/lib/rate-limit-headers.ts
export function setRateLimitHeaders(headers: Headers, result: RateLimitResult): void {
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.resetAt));
}
```

---

## Todo List

- [ ] Create `canExecuteCommand` function
- [ ] Create `COMMAND_LIMITS` configuration
- [ ] Update `interactionCreate.ts` for command limits
- [ ] Create `abuse-detection.ts` module
- [ ] Track activity in `messageCreate`
- [ ] Track activity in ticket creation
- [ ] Add `X-RateLimit-*` headers to API responses
- [ ] Add monitoring alerts for flagged guilds

---

## Success Criteria

- [ ] Commands have per-user rate limits
- [ ] Abuse detection prevents scripted attacks
- [ ] API returns rate limit headers
- [ ] Graceful degradation when Redis unavailable
- [ ] No false positives for normal usage

---

## Risk Assessment

| Risk                              | Likelihood | Impact | Mitigation                    |
| --------------------------------- | ---------- | ------ | ----------------------------- |
| False positives on active servers | Medium     | Medium | Set generous thresholds       |
| Redis latency adds overhead       | Low        | Low    | Use Redis pipelining          |
| Legitimate power users blocked    | Low        | Medium | Configurable per-guild limits |

---

## Security Considerations

- Rate limit keys should include tenant ID for multi-tenant isolation
- Log all abuse flags for audit trail
- Consider IP-based limiting for dashboard API

---

## Next Steps

After completion:

1. Monitor rate limit hit rates
2. Adjust thresholds based on real usage
3. Consider adding IP-based rate limiting
