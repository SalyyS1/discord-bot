---
title: 'Fix Dashboard API 403 and 500 Errors'
description: 'Resolve silent token failures causing 403s and unhandled exceptions causing 500s'
status: validated
priority: P0
effort: 6h
branch: fix/api-errors
tags: [api, bugfix, dashboard, auth, error-handling]
created: 2026-01-28
validated: 2026-01-28
---

## Validated Decisions

| Decision                | Choice       | Notes                                               |
| ----------------------- | ------------ | --------------------------------------------------- |
| Error codes 403→401     | ✅ Confirmed | Token issues return 401, permission issues stay 403 |
| Partial data on failure | ✅ Accept    | Use Promise.allSettled, show partial stats          |
| Encryption fallback     | C            | Fallback to bot token + log alert for admin         |
| Auto re-auth redirect   | A            | Auto-redirect after 2s delay                        |
| Phase order             | ✅ Confirmed | P0: 1-2, P1: 3, P2: 4                               |

# Fix Dashboard API 403 and 500 Errors

## Problem Summary

Dashboard shows 65/100 score due to API errors:

- **403 Forbidden**: Silent token failures cascade → empty guild array → 403
- **500 Internal**: Unhandled exceptions in parallel DB queries, encryption, missing validation

## Root Causes

| Issue                                     | Root Cause                                                       | Impact                                      |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| 403 on `/roles`, `/channels`, `/leveling` | `getUserDiscordGuilds` returns `[]` on ANY failure               | Users see "link Discord" when token expired |
| 500 on `/stats`                           | 17 parallel DB queries with `Promise.all` - one fails = all fail | Page crashes                                |
| 500 random                                | `getEncryptionService().decrypt()` throws without try-catch      | Uncaught exception                          |
| 500 on invalid guildId                    | No validation before DB queries                                  | Prisma throws                               |

## Phases

| Phase                                                | Priority | Effort | Description             |
| ---------------------------------------------------- | -------- | ------ | ----------------------- |
| [Phase 1](./phases/phase-1-fix-403-token-cascade.md) | P0       | 2h     | Fix 403 token cascade   |
| [Phase 2](./phases/phase-2-fix-500-errors.md)        | P0       | 2h     | Fix 500 server errors   |
| [Phase 3](./phases/phase-3-error-improvements.md)    | P1       | 1h     | Structured error types  |
| [Phase 4](./phases/phase-4-frontend-handling.md)     | P2       | 1h     | Frontend error handling |

## Files to Modify

```
apps/dashboard/src/lib/
  discord-oauth.ts      # Phase 1: Add error types to guild fetch
  session.ts            # Phase 1: Distinguish token vs permission errors
  tenant-token.ts       # Phase 2: Add try-catch around encryption

apps/dashboard/src/app/api/guilds/[guildId]/
  stats/route.ts        # Phase 2: Use Promise.allSettled
  */route.ts            # Phase 2: Add guildId validation

apps/dashboard/src/components/
  error-boundary.tsx    # Phase 4: Error boundary component
```

## Success Criteria

- [ ] 403 only for actual permission issues, 401 for token issues
- [ ] 500 errors eliminated - partial data returned on failures
- [ ] All routes validate guildId format before DB queries
- [ ] Frontend shows actionable error messages

## References

- [403 Analysis](./research/researcher-01-api-403-analysis.md)
- [500 Analysis](./research/researcher-02-500-errors-analysis.md)
