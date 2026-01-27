# Phase 02: Code Deduplication

**Date:** 2026-01-27 | **Priority:** High | **Status:** Pending

---

## Context

3 major code duplication patterns identified. Violates DRY principle and increases maintenance burden.

---

## Overview

| Metric           | Value     |
| ---------------- | --------- |
| Patterns to Fix  | 3         |
| Files Affected   | 15+       |
| Estimated Effort | 2-3 hours |
| Risk Level       | Low       |

---

## Key Insights

1. Settings fetch pattern appears in 10+ API routes
2. Redis client duplicated between bot and dashboard
3. Template engine not shared between apps

---

## Requirements

1. Create shared settings service utility
2. Consider consolidating Redis configuration
3. Extract template engine to shared package

---

## Pattern 1: Settings Fetch Duplication

### Current (Duplicated in 10+ files)

```typescript
let settings = await prisma.guildSettings.findUnique({ where: { guildId } });
if (!settings) {
  await ensureGuildExists(guildId);
  settings = await prisma.guildSettings.create({ data: { guildId } });
}
```

### Solution: Create Shared Utility

```typescript
// packages/config/src/settings-service.ts
import { prisma } from '@repo/database';
import type { Prisma, GuildSettings } from '@prisma/client';

export async function getOrCreateGuildSettings<T extends keyof GuildSettings>(
  guildId: string,
  select?: Prisma.GuildSettingsSelect
): Promise<GuildSettings> {
  let settings = await prisma.guildSettings.findUnique({
    where: { guildId },
    select,
  });

  if (!settings) {
    await ensureGuildExists(guildId);
    settings = await prisma.guildSettings.create({
      data: { guildId },
      select,
    });
  }

  return settings;
}

async function ensureGuildExists(guildId: string): Promise<void> {
  await prisma.guild.upsert({
    where: { id: guildId },
    create: { id: guildId, name: 'Unknown' },
    update: {},
  });
}
```

### Files to Update

```
apps/dashboard/src/app/api/guilds/[guildId]/settings/route.ts
apps/dashboard/src/app/api/guilds/[guildId]/welcome/route.ts
apps/dashboard/src/app/api/guilds/[guildId]/moderation/route.ts
apps/dashboard/src/app/api/guilds/[guildId]/leveling/route.ts
apps/dashboard/src/app/api/guilds/[guildId]/tickets/route.ts
apps/dashboard/src/app/api/guilds/[guildId]/tempvoice/route.ts
apps/dashboard/src/app/api/guilds/[guildId]/giveaways/route.ts
+ 3 more routes
```

---

## Pattern 2: Redis Client Duplication

### Current State

Two separate Redis implementations:

- `apps/bot/src/lib/redis.ts` - Bot's Redis client
- `apps/dashboard/src/lib/redis.ts` - Dashboard's Redis client

### Recommendation: Keep Separate (YAGNI)

After analysis, keeping separate is actually correct:

- Bot uses `ioredis` with subscriber pattern
- Dashboard uses simpler connection
- Different error handling needs
- Coupling would create unnecessary complexity

**Decision: No action needed - current separation is intentional**

---

## Pattern 3: Template Engine Sharing

### Current State

- `apps/bot/src/lib/template.ts` - Bot's template parser
- `apps/dashboard/src/lib/templates.ts` - Dashboard template management

### Solution: Extract Core Parser

```typescript
// packages/config/src/template-parser.ts
export interface TemplateContext {
  user?: { id: string; username: string; displayName?: string };
  guild?: { id: string; name: string; memberCount?: number };
  channel?: { id: string; name: string };
  member?: { level?: number; xp?: number; rank?: number };
  [key: string]: unknown;
}

export function parseTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path);
    return value != null ? String(value) : match;
  });
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object'
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}
```

---

## Todo List

- [ ] Create `getOrCreateGuildSettings` in `@repo/config`
- [ ] Update 10 API routes to use shared utility
- [ ] Extract `parseTemplate` to `@repo/config`
- [ ] Update bot to import from `@repo/config`
- [ ] Run `pnpm build` to verify no circular deps
- [ ] Test all affected routes

---

## Success Criteria

- [ ] No duplicated settings fetch pattern
- [ ] Template parser shared between apps
- [ ] All routes working correctly
- [ ] Build passes without errors

---

## Risk Assessment

| Risk               | Likelihood | Impact | Mitigation                      |
| ------------------ | ---------- | ------ | ------------------------------- |
| Import path issues | Medium     | Low    | Test all imports after move     |
| Missing edge cases | Low        | Medium | Keep original code as reference |

---

## Next Steps

After completion:

1. Run full build and typecheck
2. Test all API routes
3. Move to Phase 03 (Error Handling)
