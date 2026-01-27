---
title: 'Fix Dashboard Discord Data Issues'
description: 'Resolve channels/roles not showing and stats page displaying wrong data due to hardcoded bot token in multi-tenant system'
status: completed
priority: P1
effort: 3h 15min
branch: main
tags: [dashboard, discord-api, multi-tenant, bug-fix]
created: 2026-01-28
updated: 2026-01-28
---

# Dashboard Discord Data Fix

## Problem Summary

Two critical issues in dashboard:

1. **Channels/Roles not showing** - `discord.ts` and `discord-oauth.ts` use hardcoded `DISCORD_TOKEN` which may not have access to all guilds in multi-tenant system
2. **Stats showing wrong data** - Stats API only queries DB, shows "tracked members" not actual Discord member count

## Root Cause

```typescript
// lib/discord.ts:2 - Single hardcoded token
const BOT_TOKEN = process.env.DISCORD_TOKEN;

// lib/discord-oauth.ts:204 - Same issue
const DISCORD_BOT_TOKEN = process.env.DISCORD_TOKEN || '';
```

Multi-tenant system has `Tenant.discordToken` per tenant, but APIs ignore this.

## Solution: Tenant Token Lookup

For each guild API request:

1. Look up Guild → Tenant relationship
2. Get tenant's encrypted `discordToken`
3. Decrypt and use for Discord API calls
4. Fallback to `DISCORD_TOKEN` for main bot

## Implementation Phases

| Phase | Title                                                    | Effort | Priority | Files                                       |
| ----- | -------------------------------------------------------- | ------ | -------- | ------------------------------------------- |
| 01    | [Token Resolution Layer](./phase-01-token-resolution.md) | 1h     | HIGH     | `lib/discord.ts`, new `lib/tenant-token.ts` |
| 02    | [Update API Routes](./phase-02-api-routes-update.md)     | 45min  | HIGH     | `channels/route.ts`, `roles/route.ts`       |
| 03    | [Stats Enhancement](./phase-03-stats-enhancement.md)     | 1h     | MEDIUM   | `stats/route.ts`                            |
| 04    | [Error Handling & UX](./phase-04-error-handling.md)      | 30min  | MEDIUM   | API routes, selectors                       |

## Key Database Relations

```
Guild.id → (lookup) → Tenant.discordToken (encrypted)
```

**Note:** Schema shows `Tenant` has `discordToken` (AES-256-GCM encrypted).

## Success Criteria

- [ ] Channels/roles load for all guilds user manages
- [ ] Stats show actual Discord member count
- [ ] Graceful fallback when bot not in guild
- [ ] No token exposure in client-side code

## Risks

| Risk                          | Mitigation                                   |
| ----------------------------- | -------------------------------------------- |
| Token decryption adds latency | Cache decrypted tokens (5min TTL)            |
| Guild→Tenant mapping missing  | Add mapping table or store tenantId on Guild |
| Rate limits across tenants    | Per-tenant rate limit tracking               |

## Dependencies

- Encryption utils for token decryption (check if exists)
- Guild→Tenant relationship (may need schema update)

## Research Reports

- [Discord API Patterns](./research/researcher-01-discord-api-patterns.md)
- [Next.js API Patterns](./research/researcher-02-nextjs-api-patterns.md)
- [Channel/Role APIs](./scout/scout-01-channel-role-apis.md)
- [Dashboard Pages Data](./scout/scout-02-dashboard-pages-data.md)
