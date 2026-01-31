# Brainstorm: Dashboard & Discord Bot Root Cause Fix

**Date:** 2026-01-31
**Project:** SylaBot Discord Bot Platform
**Status:** Consensus Reached

---

## Problem Statement

The SylaBot platform has **13 categories** of issues affecting Dashboard ↔ Discord synchronization, configuration saving, and UI functionality. User-reported symptoms include:

- Select components (Role/Channel/Category) not working across multiple systems
- Save operations failing silently
- Data not syncing between Discord bot and Dashboard
- Authentication requiring double login
- Language preferences not persisting

## Root Cause Analysis

### 🔴 Root Cause #1: Select Component Data Dependency

**Symptoms:** Cannot select role/channel/category in Giveaway, Tickets, Voice, AutoMod

**Technical Analysis:**
- `ChannelSelector` and `RoleSelector` use local `useEffect` to fetch data when `guildId` prop is provided
- Pages inconsistently pass either:
  - `guildId` prop (triggers auto-fetch)
  - `channels/roles` array directly
  - Neither (broken state)
- No shared data provider ensures consistent channel/role data across page

**Files Affected:**
- `components/selectors/channel-selector.tsx`
- `components/selectors/role-selector.tsx`
- All pages using these selectors (tickets, giveaway, voice, moderation, leveling)

**Solution Approach:**
1. Create `GuildDataProvider` context that fetches channels/roles once per guild
2. Use `useGuildChannels()` and `useGuildRoles()` hooks from TanStack Query (already exist)
3. Pass channels/roles from context to selectors, eliminating redundant fetches
4. Add `CategorySelector` component (currently missing)

---

### 🟠 Root Cause #2: Save/Mutation Pattern Inconsistency

**Symptoms:** Changes don't save in Voice, Music, AutoMod, Giveaway pages

**Technical Analysis:**
- `use-mutations.ts` only covers 5 endpoints: settings, welcome, leveling, moderation, tickets
- Voice, Music, Giveaway pages use direct `fetch()` calls without:
  - Optimistic updates
  - Proper error handling
  - Query cache invalidation
  - CSRF token handling
- Some pages may be missing the save handler wiring entirely

**Current Coverage:**
| Module | Mutation Hook | Status |
|--------|--------------|--------|
| Settings | `useUpdateSettings` | ✅ |
| Welcome | `useUpdateWelcome` | ✅ |
| Leveling | `useUpdateLeveling` | ✅ |
| Moderation | `useUpdateModeration` | ✅ |
| Tickets | `useUpdateTickets` | ✅ |
| Voice | ❌ Direct fetch | 🔴 Missing |
| Music | ❌ Direct fetch | 🔴 Missing |
| Giveaway | ❌ Direct fetch | 🔴 Missing |
| AutoResponder | Special hooks | ⚠️ Partial |

**Solution Approach:**
1. Extend `use-mutations.ts` with:
   - `useUpdateVoice(guildId)`
   - `useUpdateMusic(guildId)`
   - `useUpdateGiveaway(guildId)`
2. Add CSRF token handling to all mutations
3. Implement consistent error toast messages
4. Wire save buttons on all pages to use these hooks

---

### 🟡 Root Cause #3: Data Sync (Dashboard ↔ Discord)

**Symptoms:**
- Discord-created giveaways not shown in Dashboard
- Tickets opened via bot not visible
- Stats showing stale/incorrect data

**Technical Analysis:**
- `configSync.ts` publishes Redis events for: Welcome, Moderation, Leveling, AutoResponder, TempVoice
- Missing pub/sub for: Giveaways, Tickets, Music
- Bot → Dashboard events not implemented (only Dashboard → Bot exists)

**Current Sync Coverage:**
| Module | Dashboard → Bot | Bot → Dashboard |
|--------|----------------|-----------------|
| Welcome | ✅ | ❌ |
| Moderation | ✅ | ❌ |
| Leveling | ✅ | ❌ |
| AutoResponder | ✅ | ❌ |
| TempVoice | ✅ | ❌ |
| Giveaways | ❌ | ❌ |
| Tickets | ❌ | ❌ |
| Music | ❌ | ❌ |

**Solution Approach:**
1. Add publishers in `configSync.ts`:
   - `publishGiveawayUpdate(guildId, action)`
   - `publishTicketUpdate(guildId, action)`
   - `publishMusicUpdate(guildId, action)`
2. Add bot-side subscribers to invalidate local cache
3. Add bot → dashboard event publishers for:
   - Giveaway created/ended on Discord
   - Ticket opened/closed on Discord
4. Dashboard WebSocket client to receive bot events and invalidate TanStack Query cache

---

## Secondary Issues (After Root Causes Fixed)

### #11 Authentication Double Login

**Analysis:**
- Landing page and Dashboard use same Better-Auth instance
- Session cookie names: `__Secure-better-auth.session_data`, `better-auth.session_data`
- Middleware checks for session correctly

**Possible Causes:**
1. Landing page uses different auth endpoint than Dashboard
2. Cookie domain/path mismatch
3. HTTPS vs HTTP cookie prefix issue (`__Secure-` only works on HTTPS)

**Investigation Needed:** Check if landing page is on different subdomain or auth endpoint.

### #10 Language Persistence

**Analysis:**
- Uses `next-intl` with URL-based locales (`/vi/...`, `/en/...`)
- Default locale: `vi`
- User preference may not be stored server-side

**Solution:**
1. Store language preference in user DB table
2. On login, redirect to stored locale
3. On language switch, persist to DB + cookie

### #3 Statistics Accuracy

**Issue:** Member count showing wrong (e.g., shows 500 when 3)

**Root Cause:** Dashboard fetches from Discord API but may be caching stale data or using wrong API endpoint.

**Solution:** Ensure stats API calls Discord directly with cache headers `s-maxage=30`.

---

## Recommended Implementation Order

### Phase 1: Foundation (Select Components + Mutations)
1. Create `GuildDataProvider` context
2. Extend `use-mutations.ts` with Voice, Music, Giveaway hooks
3. Audit all pages to use new hooks
4. Add `CategorySelector` component

### Phase 2: Data Sync
1. Add missing publishers (Giveaway, Tickets, Music)
2. Add bot-side event publishers
3. Implement WebSocket event handling in dashboard
4. Test bidirectional sync

### Phase 3: Polish & Edge Cases
1. Fix authentication double login
2. Fix language persistence
3. Fix statistics accuracy
4. Profile page enhancements
5. Documentation/landing page fixes

---

## Success Metrics

1. **All select components work** in Giveaway, Tickets, Voice, AutoMod, Leveling
2. **Save operations succeed** with toast confirmation
3. **Discord-created giveaways** appear in Dashboard within 5 seconds
4. **Single login** works across landing + dashboard
5. **Language persists** across navigation and sessions
6. **Stats accuracy** matches Discord exactly

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing save flows | High | Keep backward compatibility, add tests |
| Redis pub/sub message loss | Medium | Implement retry logic, fallback to DB polling |
| WebSocket connection instability | Medium | Auto-reconnect + optimistic UI updates |
| Performance impact from provider | Low | Use TanStack Query caching, no redundant fetches |

---

## Next Steps

User confirmed all 3 root causes should be addressed. Ready to create detailed implementation plan.

---

## Unresolved Questions

1. Is the landing page on a different subdomain than dashboard? (Affects auth investigation)
2. What is the expected bot → dashboard latency for events? (Real-time WebSocket vs polling)
3. Should templates be versioned for rollback capability?
