# Phase 6: Voice Management Enhancement

## Context Links

- [Voice Page](apps/dashboard/src/app/[locale]/(dashboard)/dashboard/voice/page.tsx)
- [Voice API Route](apps/dashboard/src/app/api/guilds/[guildId]/voice/route.ts)
- [Category Selector](apps/dashboard/src/components/selectors/category-selector.tsx)

## Overview

**Priority:** P2 - Important
**Status:** Pending
**Effort:** 3 hours

Add image upload for voice customization panel, expand customization options, and sync Discord-configured channels to Dashboard.

## Key Insights

1. Voice page exists with temp voice settings
2. CategorySelector component already created in Phase 1
3. Missing image upload capability for voice panel customization
4. Discord-configured voice channels not reflecting in Dashboard
5. Limited visual customization options currently available

## Requirements

### Functional
- FR-1: Support image upload for voice control panel embed
- FR-2: Additional layout options (compact, expanded, minimal)
- FR-3: Behavior settings (auto-lock timeout, idle kick)
- FR-4: Visual settings (custom icons, button colors)
- FR-5: Sync Discord voice channel configs to Dashboard display

### Non-Functional
- NFR-1: Image uploads max 2MB, validated formats (PNG, JPG, GIF)
- NFR-2: Settings save within 2 seconds
- NFR-3: Discord sync within 30 seconds of config change

## Architecture

```
Voice Config Sync:
Discord Bot (voice channel created)
    |
    v
Bot Event Handler -> Publish to Redis
    |
    v
Dashboard API (poll/SSE) -> Display updated channels
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/voice/page.tsx` | Add image upload, new settings sections |
| `apps/dashboard/src/app/api/guilds/[guildId]/voice/route.ts` | Handle image upload, expanded settings |
| `packages/config/src/sync/channels.ts` | Add voice config sync channel |

### Files to Create
| File | Purpose |
|------|---------|
| `apps/dashboard/src/components/voice/image-uploader.tsx` | Image upload component for voice panel |
| `apps/dashboard/src/components/voice/layout-selector.tsx` | Panel layout options selector |

## Implementation Steps

### Step 1: Add Image Upload Component (45 min)

1. Create `image-uploader.tsx` with drag-drop support
2. Validate file type (PNG, JPG, GIF) and size (max 2MB)
3. Upload to storage (S3/Cloudinary) and return URL
4. Add preview with remove capability

### Step 2: Expand Voice Settings UI (45 min)

1. Add layout selector dropdown (compact/expanded/minimal)
2. Add auto-lock timeout input (minutes)
3. Add idle kick settings (enable toggle, timeout minutes)
4. Add button color picker for voice panel
5. Add custom icon URL input

### Step 3: Update Voice API Route (30 min)

1. Extend voice settings schema for new fields
2. Handle image upload processing
3. Validate and save expanded settings
4. Update Prisma schema if needed

### Step 4: Discord Channel Sync (60 min)

1. Add bot event listener for voice channel updates
2. Publish channel config changes to Redis
3. Dashboard polls/subscribes for updates
4. Display Discord-configured channels in Dashboard

## Todo List

- [ ] Create ImageUploader component
- [ ] Add file validation (type, size)
- [ ] Integrate image upload to storage service
- [ ] Add layout selector (compact/expanded/minimal)
- [ ] Add auto-lock timeout setting
- [ ] Add idle kick settings
- [ ] Add button color picker
- [ ] Add custom icon URL input
- [ ] Update voice API route for new settings
- [ ] Implement Discord voice channel sync
- [ ] Test image upload flow
- [ ] Test settings save correctly

## Success Criteria

1. **Image Upload:** Can upload/preview/remove panel images
2. **New Settings:** All layout/behavior/visual options save correctly
3. **Discord Sync:** Voice channels configured in Discord appear in Dashboard
4. **Persistence:** All settings persist across page reloads

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Large image uploads slow | Medium | Medium | Client-side compression before upload |
| Storage costs | Low | Low | Use optimized formats, size limits |
| Sync delays | Medium | Low | Use Redis pub/sub, fallback to polling |

## Security Considerations

- Image uploads validated server-side (type, size, content-type header)
- URLs sanitized before storage
- Only guild admins can modify voice settings
- No executable content in uploads

## Next Steps

After this phase:
1. Voice customization significantly enhanced
2. Phase 7 (Music System) can proceed
