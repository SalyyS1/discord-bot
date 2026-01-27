---
stage: "1"
phase: "03"
title: "Pub/Sub Sync"
status: complete
priority: P1
effort: 1h
---

# Phase 1.3: Pub/Sub Sync

**Parent**: [Stage 1 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/overview.md)

## Overview

Add Pub/Sub publish calls to dashboard APIs that currently miss them.

## APIs Missing Pub/Sub

| API | Issue | Fix |
|-----|-------|-----|
| `/api/guilds/[guildId]/voice` | Writes to DB, no Pub/Sub | Add `publishTempVoiceUpdate()` |
| `/api/guilds/[guildId]/tickets/settings` | Writes to DB, no Pub/Sub | Add `publishTicketsUpdate()` |
| `/api/guilds/[guildId]/tickets/panels` | Writes to DB, no Pub/Sub | Add `publishTicketsUpdate()` |

## Implementation

### voice/route.ts
```diff
+ import { publishTempVoiceUpdate } from '@/lib/configSync';

  export async function PATCH(...) {
    // ... existing DB write ...
+   await publishTempVoiceUpdate(guildId, 'update');
    return ApiResponse.success(settings);
  }
```

### tickets/settings/route.ts
```diff
+ import { getPublisher } from '@/lib/configSync';

  export async function PATCH(...) {
    // ... existing DB write ...
+   await getPublisher().publish(guildId, 'TICKETS', 'update');
    return ApiResponse.success({ updated: true });
  }
```

## Todo

- [ ] Add Pub/Sub to voice API
- [ ] Add Pub/Sub to ticket settings API
- [ ] Add Pub/Sub to ticket panels API
- [ ] Verify bot logs show cache invalidation

## Success Criteria

- Dashboard save → Bot log shows "Invalidated X cache for {guildId}"
