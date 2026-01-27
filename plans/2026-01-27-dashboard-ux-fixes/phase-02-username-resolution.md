# Phase 02: Username Resolution

**Date:** 2026-01-27 | **Priority:** HIGH | **Status:** completed | **Effort:** 2h

---

## Overview

Fix "Unknown" usernames in leaderboard by storing username in Member model and updating on XP gain.

## Problem Analysis

**Root Cause Chain:**

1. Stats API returns `discordId` from Member table (line 78)
2. Dashboard expects `nodeName` property (line 324-346 in page.tsx)
3. Member model has no username field
4. API never fetches from Discord to resolve names

---

## Requirements

1. Add `username` field to Member model
2. Update stats API to return username
3. Update dashboard to display username correctly
4. Update XP gain flow to store username

---

## Related Files

| File                                                             | Purpose                        |
| ---------------------------------------------------------------- | ------------------------------ |
| `packages/database/prisma/schema.prisma`                         | Add username field             |
| `apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts`     | Return username in leaderboard |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/page.tsx` | Fix display logic              |
| `apps/bot/src/features/leveling/index.ts`                        | Store username on XP gain      |

---

## Implementation Steps

### Task 2.1: Update Schema (15 min)

**File:** `packages/database/prisma/schema.prisma`

Add to Member model (around line 379):

```prisma
model Member {
  id        String @id @default(cuid())
  discordId String
  guildId   String
  guild     Guild  @relation(fields: [guildId], references: [id], onDelete: Cascade)

  // User info (denormalized for dashboard)
  username    String?   // Add this field
  displayName String?   // Optional: Discord display name
  avatarHash  String?   // Optional: for future avatar display

  // ... rest of model
}
```

**Run migration:**

```bash
pnpm db:migrate --name add_member_username
```

### Task 2.2: Update Stats API (20 min)

**File:** `apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts`

Update topMembers query (lines 72-82):

```typescript
// Top 10 members by XP
prisma.member.findMany({
  where: { guildId },
  orderBy: { xp: 'desc' },
  take: 10,
  select: {
    discordId: true,
    username: true,  // Add username
    xp: true,
    level: true,
  }
}),
```

Update response mapping (line 170):

```typescript
leaderboard: topMembers.map(m => ({
  discordId: m.discordId,
  nodeName: m.username || `User#${m.discordId.slice(-4)}`,  // Fallback
  xp: m.xp,
  level: m.level,
})),
```

### Task 2.3: Update Dashboard Display (15 min)

**File:** `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/page.tsx`

Update GuildStats interface (around line 49):

```typescript
leaderboard: Array<{
  discordId: string;
  nodeName: string;
  xp: number;
  level: number;
}>;
```

Leaderboard display should already work with `nodeName` after API update.

### Task 2.4: Store Username on XP Gain (30 min)

**File:** `apps/bot/src/features/leveling/index.ts` (or equivalent XP handler)

When updating member XP, also update username:

```typescript
await prisma.member.upsert({
  where: {
    discordId_guildId: {
      discordId: member.user.id,
      guildId: member.guild.id,
    },
  },
  update: {
    xp: { increment: xpGain },
    totalMessages: { increment: 1 },
    lastXpGain: new Date(),
    username: member.user.username, // Add this
  },
  create: {
    discordId: member.user.id,
    guildId: member.guild.id,
    xp: xpGain,
    totalMessages: 1,
    lastXpGain: new Date(),
    username: member.user.username, // Add this
  },
});
```

---

## Todo List

- [x] Add username, displayName, avatarHash fields to Member model
- [x] Run prisma migration
- [x] Update stats API to select and return username
- [x] Add fallback logic for missing usernames (`User#1234`)
- [x] Update bot XP handler to store username on update
- [ ] Test leaderboard displays usernames correctly

---

## Success Criteria

1. Leaderboard shows actual usernames for members who gained XP after deploy
2. Legacy members without username show fallback `User#1234` format
3. No "Unknown" displayed in leaderboard

---

## Risk Assessment

| Risk               | Likelihood | Impact | Mitigation                            |
| ------------------ | ---------- | ------ | ------------------------------------- |
| Migration failure  | Low        | High   | Nullable field, additive-only         |
| Stale usernames    | Medium     | Low    | Accept staleness; updates on activity |
| Performance impact | Low        | Low    | No additional queries needed          |

---

## Migration Notes

```bash
# Development
cd packages/database
pnpm prisma migrate dev --name add_member_username

# Production (after PR merge)
pnpm prisma migrate deploy
```

**This is a safe migration:**

- All new fields are nullable (`String?`)
- No data transformation required
- Existing members will have null username (handled by fallback)

---

## Testing

```bash
# After migration
1. Send a message in Discord server
2. Check database: Member.username should be populated
3. Open dashboard leaderboard
4. Verify username displays instead of "Unknown"
```
