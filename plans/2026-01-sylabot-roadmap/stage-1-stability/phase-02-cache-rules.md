---
stage: "1"
phase: "02"
title: "Cache Rules"
status: complete
priority: P1
effort: 1.5h
---

# Phase 1.2: Cache Rules Enforcement

**Parent**: [Stage 1 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/overview.md)

## Rules

### Rule 1: DB-First on Cache Miss

```typescript
async getOrFetch(guildId: string): Promise<GuildSettings> {
  const cached = await redis.get(`settings:${guildId}`);
  if (cached) return JSON.parse(cached);
  
  // FALLBACK TO DB (required)
  const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
  if (settings) {
    await redis.setex(`settings:${guildId}`, 3600, JSON.stringify(settings));
  }
  return settings ?? DEFAULT_SETTINGS;
}
```

### Rule 2: Dashboard Writes → DB First → Pub/Sub

```
Dashboard PATCH → PostgreSQL → Pub/Sub → Bot invalidates cache
```

### Rule 3: Lazy Cache Loading

```
Bot startup → NO eager cache warming
Cache populates on-demand when guilds are accessed
```

## Files to Verify/Modify

| File | Check |
|------|-------|
| `apps/bot/src/lib/settings.ts` | Verify DB fallback exists |
| `apps/bot/src/index.ts` | Verify no eager cache warming |

## Todo

- [ ] Verify `SettingsCache.getOrFetch` has DB fallback
- [ ] Verify bot startup is lazy
- [ ] Test Redis-down scenario

## Success Criteria

- Stop Redis → Bot continues working
- PM2 restart → All settings preserved
