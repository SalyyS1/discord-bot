# Phase 10: Profile Page Enhancement

## Context Links

- [Profile Page](apps/dashboard/src/app/[locale]/(dashboard)/profile/page.tsx)
- [User Subscription API](apps/dashboard/src/app/api/user/subscription/route.ts)
- [User Redeem API](apps/dashboard/src/app/api/user/redeem/route.ts)

## Overview

**Priority:** P2 - Important
**Status:** Pending
**Effort:** 4 hours

Enhance profile page with badges, achievements, tags, custom avatar/display name, subscription expiration, and activity logs.

## Key Insights

1. Current profile shows basic subscription info and code redemption
2. No badges, achievements, or tags system
3. No custom avatar/display name (uses Discord defaults)
4. Subscription expiration date shown if PREMIUM
5. No activity or audit logs on profile

## Requirements

### Functional
- FR-1: Display earned badges (contributor, early adopter, premium, etc.)
- FR-2: Show achievements with progress tracking
- FR-3: Custom tags/titles user can display
- FR-4: Custom avatar upload (overrides Discord avatar)
- FR-5: Custom display name setting
- FR-6: Clear subscription expiration display
- FR-7: Activity log (last login, commands used, etc.)
- FR-8: Audit log (settings changes, actions taken)

### Non-Functional
- NFR-1: Avatar upload max 1MB
- NFR-2: Profile loads within 1 second
- NFR-3: Activity log paginated (last 50 entries)

## Architecture

```
Profile Data Model:
User
  |-- badges: Badge[] (earned badges)
  |-- achievements: Achievement[] (with progress)
  |-- tags: string[] (custom tags)
  |-- customAvatar: string? (URL)
  |-- customDisplayName: string?
  |-- subscription: Subscription
  |-- activityLog: ActivityEntry[]
  |-- auditLog: AuditEntry[]
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `apps/dashboard/src/app/[locale]/(dashboard)/profile/page.tsx` | Add new sections |
| `apps/dashboard/src/app/api/user/route.ts` | Extended user data endpoint |

### Files to Create
| File | Purpose |
|------|---------|
| `apps/dashboard/src/components/profile/profile-badge-display.tsx` | Badges grid display |
| `apps/dashboard/src/components/profile/profile-achievement-list.tsx` | Achievements with progress |
| `apps/dashboard/src/components/profile/profile-tag-selector.tsx` | Tag selection component |
| `apps/dashboard/src/components/profile/profile-avatar-uploader.tsx` | Custom avatar upload |
| `apps/dashboard/src/components/profile/profile-activity-log.tsx` | Activity log display |
| `apps/dashboard/src/app/api/user/avatar/route.ts` | Avatar upload endpoint |
| `apps/dashboard/src/app/api/user/profile/route.ts` | Profile update endpoint |
| `apps/dashboard/src/app/api/user/activity/route.ts` | Activity log endpoint |

### Database Changes
| Table | Changes |
|-------|---------|
| `User` | Add: customAvatar, customDisplayName, selectedTags |
| `UserBadge` | New: userId, badgeId, earnedAt |
| `UserAchievement` | New: userId, achievementId, progress, completedAt |
| `ActivityLog` | New: userId, action, metadata, createdAt |

## Implementation Steps

### Step 1: Database Schema Updates (30 min)

1. Add new fields to User model
2. Create UserBadge join table
3. Create UserAchievement with progress field
4. Create ActivityLog table
5. Run migrations

### Step 2: Badges System (45 min)

1. Define badge types (contributor, early_adopter, premium, etc.)
2. Create badge award logic (hooks into relevant events)
3. Create ProfileBadgeDisplay component
4. Render badges in profile with tooltips

### Step 3: Achievements System (45 min)

1. Define achievements with requirements
2. Create progress tracking logic
3. Create ProfileAchievementList component
4. Show progress bars for incomplete achievements

### Step 4: Custom Avatar & Display Name (45 min)

1. Create avatar upload API route
2. Create ProfileAvatarUploader component
3. Add display name input field
4. Save to user profile, display in header

### Step 5: Tags System (30 min)

1. Define available tags (based on badges/achievements)
2. Create ProfileTagSelector component
3. Allow user to select displayed tags
4. Show tags on profile and in servers

### Step 6: Activity & Audit Logs (45 min)

1. Create ActivityLog display component
2. Create activity log API endpoint with pagination
3. Log key actions (login, command use, settings change)
4. Display formatted log entries

## Todo List

- [ ] Update Prisma schema with new fields/tables
- [ ] Run database migrations
- [ ] Define badge types and criteria
- [ ] Create badge award logic
- [ ] Create ProfileBadgeDisplay component
- [ ] Define achievements and requirements
- [ ] Create ProfileAchievementList component
- [ ] Create avatar upload API route
- [ ] Create ProfileAvatarUploader component
- [ ] Add custom display name input
- [ ] Create ProfileTagSelector component
- [ ] Create ActivityLog table and API
- [ ] Create ProfileActivityLog component
- [ ] Integrate all components into profile page
- [ ] Test full profile flow

## Success Criteria

1. **Badges:** Users see earned badges with descriptions
2. **Achievements:** Progress visible, completed achievements highlighted
3. **Customization:** Avatar and display name changes persist
4. **Tags:** Selected tags display on profile
5. **Subscription:** Expiration date clearly visible
6. **Logs:** Activity history viewable with pagination

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Avatar storage costs | Low | Low | Size limits, compression |
| Achievement tracking complexity | Medium | Medium | Start simple, expand later |
| Activity log size | Low | Low | Log rotation, retention policy |

## Security Considerations

- Avatar content-type validation
- Display name sanitization (no HTML/scripts)
- Activity logs contain no sensitive data
- Profile privacy settings (public/private)

## Next Steps

After this phase:
1. Profile page fully enhanced
2. Phase 11 (Auth & i18n Fixes) can proceed
