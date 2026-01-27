---
title: "SylaBot Dashboard Fixes v2"
description: "Production-safe fixes for dashboard sync, persistence, and rebrand"
status: pending
priority: P1
effort: 4h
branch: main
tags: [dashboard, cache, persistence, rebrand]
created: 2026-01-27
---

# SylaBot Platform Fixes — Production Plan

## Executive Summary

| Problem | Solution | Risk |
|---------|----------|------|
| Guild switch shows stale data | Proper query key namespacing + cache removal | Low |
| Settings lost after restart | DB-first pattern verification | Low |
| Rebrand incomplete | Scoped string replacement | Low |

## Architecture Principles

### Data Ownership (Non-Negotiable)

```
┌─────────────────────────────────────────────────────┐
│  PostgreSQL = SINGLE SOURCE OF TRUTH                │
│  Redis = CACHE ONLY (never authoritative)           │
│  Bot must work correctly with empty Redis           │
└─────────────────────────────────────────────────────┘
```

### Query Key Convention

**Before (flat):**
```typescript
['guild-settings', guildId]  // ❌ Inconsistent
```

**After (namespaced):**
```typescript
['guild', guildId, 'settings']   // ✅ Hierarchical
['guild', guildId, 'channels']
['guild', guildId, 'roles']
['guilds']                        // User's guild list
```

## Phases

| Phase | Focus | Effort | Status |
|-------|-------|--------|--------|
| [Phase 01](./phase-01-query-keys.md) | Dashboard query key redesign | 1.5h | 🔲 |
| [Phase 02](./phase-02-cache-rules.md) | Caching & persistence rules | 1h | 🔲 |
| [Phase 03](./phase-03-rebrand.md) | Safe KisBot → SylaBot rebrand | 1h | 🔲 |
| [Phase 04](./phase-04-verify-push.md) | Verify + Push to GitHub | 0.5h | 🔲 |

## Non-Goals (Explicitly Excluded)

- ❌ Ticket v1 → v2 migration
- ❌ Breaking API changes
- ❌ Database schema changes
- ❌ Changing Redis data structures
- ❌ Full cache warming on startup

## Verification Checklist

```bash
# Typecheck
pnpm typecheck

# Manual Test
1. Dashboard: Switch Server A → B (data must change immediately)
2. Dashboard: Edit setting → PM2 restart → verify setting persists
3. Bot: Verify embed shows "SylaBot"
```

## Rollback Safety

All changes are code-only. Rollback via:
```bash
git revert HEAD~N  # N = number of commits
```
