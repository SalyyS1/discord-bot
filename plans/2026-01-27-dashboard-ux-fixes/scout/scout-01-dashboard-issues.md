# Dashboard UX Issues Analysis

**Date**: 2026-01-27
**Analyst**: Claude
**Scope**: Dashboard loading delays, navigation bugs, stats inaccuracies

---

## Issue 1: Autoresponder Page Loading Delay

### File Location
- apps/dashboard/src/app/[locale]/(dashboard)/dashboard/autoresponder/page.tsx

### Root Cause Analysis

The autoresponder page shows a blank state and then loads data late due to a **waterfall data fetching pattern** combined with **lack of skeleton/loading states**.

#### Problem Code (lines 162-210):

The page uses:
1. useGuildContext() for selectedGuildId (line 162)
2. useGuilds() hook with TanStack Query (line 163)
3. Manual fetchGuildData() callback (lines 166-200)
4. Two useEffects that create a waterfall (lines 202-210)

### Issues Identified

1. **Waterfall Loading Pattern**: 
   - First wait for useGuilds() to load
   - Then wait for GuildContext to initialize from localStorage
   - Then auto-select first guild (line 202-206)
   - Then trigger fetchGuildData() (line 208-210)

2. **No Skeleton States**: The loading check (line 393-399) only shows a spinner

3. **Manual Fetch Instead of TanStack Query**: The fetchGuildData function uses raw fetch() instead of useQuery, losing caching and deduplication benefits.

4. **GuildContext Initialization Delay**: From guild-context.tsx (lines 20-26) - isInitialized only becomes true after first client render

### Suggested Fixes

1. Create dedicated hooks using TanStack Query for autoresponders, roles, channels
2. Add skeleton loading states while data loads
3. Prefetch data in server components or on guild selection
4. Consider Suspense boundaries with React 18 streaming

---

## Issue 2: Profile Navigation Bug

### File Location
- apps/dashboard/src/components/user-dropdown.tsx

### Root Cause Analysis

The "Profile" menu item incorrectly navigates to Settings page instead of Profile page.

#### Problem Code (lines 63-68):

```
DropdownMenuItem -> Link href="/dashboard/settings" with label "Profile"  
```

And the Settings item (lines 70-75) also points to /dashboard/settings.

### Issue
Both "Profile" and "Settings" menu items point to /dashboard/settings.

### Profile Page Exists
- apps/dashboard/src/app/[locale]/(dashboard)/profile/page.tsx exists and is a proper profile page with subscription management.

### Suggested Fix

Change line 64 from:
  Link href="/dashboard/settings"
to:
  Link href="/profile"

---

## Issue 3: Settings Page UX Issues

### File Location
- apps/dashboard/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx

### Current Layout Analysis

The settings page has a 2-column layout (lines 81-366):
- Main content (lg:col-span-2): Bot Status, Database Connection, Language and Region, Notifications
- Sidebar (lg:col-span-1): Quick Links, Version Info, Theme, Danger Zone

### Identified UX Issues

1. **Fake/Static Data (lines 56-66)**:
   - Uses setTimeout with hardcoded data
   - guilds: 1, users: 150, commands: 45, uptime: 99.9%

2. **No User Profile Section**: Settings page has bot stats but no actual user profile settings

3. **No Guild Selection Context**: Unlike other pages, settings does not show which guilds settings are being viewed

4. **Notification Toggles Not Persisted**: Switch components use defaultChecked without state management

5. **Quick Links Are Empty Buttons**: Lines 270-281 have buttons with no actual hrefs or onClicks

6. **Danger Zone Has No Confirmations**: Lines 357-362 - destructive actions without confirmation dialogs

### Suggested Improvements

1. Add actual API calls for bot stats
2. Add user profile section (from session data)
3. Connect toggles to persistent state
4. Add confirmation dialogs for danger zone
5. Add actual links to documentation/support

---

## Issue 4: Overview Stats Incorrect (Online vs Total Members)

### File Location
- Dashboard Page: apps/dashboard/src/app/[locale]/(dashboard)/dashboard/page.tsx
- Stats API: apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts

### Root Cause Analysis

The stats API counts members from the **database** (prisma.member.count), not from Discord API directly.

#### Stats API Code (lines 41-43):
```
prisma.member.count({ where: { guildId } })
```

### Issue

prisma.member.count only counts members who have:
- Sent messages (XP tracked)
- Been processed by the leveling system
- Interacted with the bot

This is NOT the actual guild member count from Discords API (guild.memberCount).

### Why It Might Show Online Count

If the bot only tracks members who have been active recently, the database count could appear similar to online counts because:
1. Only active members get recorded in the Member table
2. Members who joined but never interacted are not in the database

### Suggested Fix

Option 1: Fetch from Discord API via bot endpoint

Option 2: Store guild.memberCount when bot receives guild update events:
```
await prisma.guild.update({
  where: { id: guildId },
  data: { memberCount: guild.memberCount }
});
```

---

## Issue 5: Top Members Showing Unknown

### File Location
- Dashboard Page: apps/dashboard/src/app/[locale]/(dashboard)/dashboard/page.tsx (lines 324-347)
- Stats API: apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts (lines 72-82)

### Root Cause Analysis

#### Stats API Leaderboard Query (lines 72-82):
```
prisma.member.findMany({
  where: { guildId },
  orderBy: { xp: 'desc' },
  take: 10,
  select: {
    discordId: true,  // Only selects discordId
    xp: true,
    level: true,
  }
})
```

The query only returns discordId, xp, and level. There is no username stored in the Member model or fetched from Discord API.

#### Dashboard Display Code (lines 324-346):
```
{member.nodeName || 'Unknown'}  // Uses nodeName which does not exist
```

The dashboard looks for member.nodeName but the API returns member.discordId.

#### GuildStats Interface (line 49):
```
leaderboard: Array<{ nodeName: string; xp: number; level: number }>;
```

The interface expects nodeName but API provides discordId.

### Root Causes

1. Schema Mismatch: API returns discordId, dashboard expects nodeName
2. No Username Storage: The Member model does not store username/displayName
3. No Discord API Lookup: The stats API does not fetch member info from Discord

### Suggested Fixes

**Option 1: Store username in Member table**
Add username and displayName fields to Member model.
Update on XP gain to store current username.

**Option 2: Fetch from Discord in API**
After getting top members, fetch user details from Discord API.

**Option 3: Fix interface alignment**
Change dashboard to use discordId and display it, or fetch username client-side.

---

## Summary Table

| Issue | File | Root Cause | Severity | Fix Complexity |
|-------|------|------------|----------|----------------|
| 1. Autoresponder Loading | autoresponder/page.tsx | Waterfall fetch, no skeletons | Medium | Medium |
| 2. Profile Navigation | user-dropdown.tsx | Wrong href | High | Low (1 line) |
| 3. Settings UX | settings/page.tsx | Static data, no persistence | Medium | Medium |
| 4. Member Count Wrong | stats/route.ts | Database vs Discord count | High | Medium |
| 5. Unknown Usernames | stats/route.ts, page.tsx | No username in query/storage | High | Medium |

---

## Recommended Priority

1. **Issue 2** (Profile Navigation) - Quick win, 1 line fix
2. **Issue 5** (Unknown Usernames) - User-facing, confusing UX
3. **Issue 4** (Member Count) - Data accuracy issue
4. **Issue 1** (Loading Delay) - Performance/UX improvement
5. **Issue 3** (Settings UX) - Lower impact, more work
