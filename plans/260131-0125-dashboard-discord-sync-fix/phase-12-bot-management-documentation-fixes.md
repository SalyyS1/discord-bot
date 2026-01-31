# Phase 12: Bot Management & Documentation Fixes

## Context Links

- [Bots Page](apps/dashboard/src/app/[locale]/(dashboard)/dashboard/bots/[id]/page.tsx)
- [Features Page](apps/dashboard/src/app/[locale]/features/page.tsx)
- [Document Pages](apps/dashboard/src/app/[locale]/document/)
- [Landing Page](apps/dashboard/src/app/[locale]/page.tsx)

## Overview

**Priority:** P3 - Nice-to-have
**Status:** ✅ Complete
**Effort:** 4 hours

Fix non-functional bot management page, populate bot configuration settings, fix empty quick links, and make documentation accessible.

## Key Insights

1. "Manage your custom Discord bots" page exists but non-functional
2. "Dashboard and bot configuration" page lacks actual settings
3. Quick links section showing empty
4. Documentation pages exist under `/document/wiki/` but may be inaccessible
5. "Trusted by growing communities" section has display issues

## Requirements

### Functional
- FR-1: Bot management page loads and displays bot list
- FR-2: Bot configuration page shows all settings
- FR-3: Quick links section populated with relevant links
- FR-4: Documentation pages accessible and navigable
- FR-5: Community trust section displays properly

### Non-Functional
- NFR-1: Bot list loads within 2 seconds
- NFR-2: Documentation search works
- NFR-3: Responsive design on all pages

## Architecture

```
Bot Management:
Dashboard -> /bots -> List user's custom bots
    |
    v
Bot detail page -> Configuration options
    |
    v
Save changes -> API -> Update bot config
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/bots/page.tsx` | Create if missing, implement bot list |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/bots/[id]/page.tsx` | Fix bot configuration UI |
| `apps/dashboard/src/app/[locale]/document/page.tsx` | Fix documentation access |
| `apps/dashboard/src/app/[locale]/page.tsx` | Fix quick links, community section |
| `apps/dashboard/src/components/landing/hero-section.tsx` | Fix community trust display |

### Files to Create
| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/user/bots/route.ts` | User bots list API |
| `apps/dashboard/src/app/api/user/bots/[id]/route.ts` | Bot config CRUD API |
| `apps/dashboard/src/components/bots/bot-card-display.tsx` | Bot card component |
| `apps/dashboard/src/components/bots/bot-config-form.tsx` | Bot configuration form |

## Implementation Steps

### Step 1: Bot Management List Page (1 hour)

1. Create/fix bots list page
2. Fetch user's custom bots from API
3. Display bot cards with name, status, avatar
4. Add "Create Bot" button
5. Link to individual bot config pages

### Step 2: Bot Configuration Page (1 hour)

1. Fix bot detail page to load bot config
2. Add settings sections:
   - General (name, avatar, status)
   - Permissions (allowed commands)
   - Presence (activity, status)
   - Features (enabled modules)
3. Save configuration to API

### Step 3: Quick Links Section (30 min)

1. Identify quick links container on landing/dashboard
2. Populate with relevant links:
   - Documentation
   - Support server
   - GitHub
   - Status page
3. Style appropriately

### Step 4: Documentation Accessibility (1 hour)

1. Check wiki page routing
2. Ensure MDX content loading properly
3. Fix navigation between doc pages
4. Add documentation search if missing
5. Add breadcrumb navigation

### Step 5: Community Trust Section (30 min)

1. Fix "Trusted by growing communities" section
2. Add real server count/user stats
3. Display server logos if available
4. Animate stats counter

## Todo List

- [x] Create/fix bots list page
- [x] Create user bots API route
- [x] Create BotCard component
- [x] Fix bot configuration page
- [x] Create BotConfigForm component
- [x] Create bot config API route
- [x] Populate quick links section
- [x] Fix documentation page routing
- [x] Fix MDX content loading
- [x] Add documentation navigation
- [x] Fix community trust section
- [x] Add real stats to landing page
- [x] Test all pages load correctly

## Success Criteria

1. **Bot Management:** Can view, create, configure custom bots
2. **Configuration:** All bot settings editable and saveable
3. **Quick Links:** Relevant links visible and clickable
4. **Documentation:** All wiki pages accessible and readable
5. **Community Section:** Displays correctly with real data

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Bot API complexity | Medium | Medium | Start with basic CRUD |
| MDX loading issues | Low | Medium | Fallback to static content |
| Missing documentation | Low | Medium | Placeholder pages |

## Security Considerations

- Bot management only for bot owners
- Bot tokens never exposed to client
- Documentation public, no auth required
- Rate limit bot creation

## Next Steps

After this phase:
1. Bot management functional
2. Documentation accessible
3. Phase 13 (Review System) can proceed
