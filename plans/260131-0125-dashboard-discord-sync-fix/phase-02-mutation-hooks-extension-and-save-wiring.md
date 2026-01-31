# Phase 2: Mutation Hooks Extension & Save Wiring

## Context Links

- [Mutations Analysis](./research/researcher-02-mutations-redis-sync-analysis.md)
- Current mutations: `apps/dashboard/src/hooks/use-mutations.ts`
- Voice page: `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/voice/page.tsx`
- Giveaway page: `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/giveaway/page.tsx`
- Query keys: `apps/dashboard/src/lib/query-keys.ts`

## Overview

**Priority:** P1 - Critical
**Status:** Pending
**Effort:** 3 hours

Extend the mutation factory pattern to cover Voice, Music, and Giveaway settings pages. Wire save buttons to use proper mutation hooks with optimistic updates and cache invalidation.

## Key Insights

1. `use-mutations.ts` has factory pattern: `createGuildMutation(guildId, config)`
2. Current coverage: settings, welcome, leveling, moderation, tickets
3. Missing: voice, music, giveaways/settings
4. Voice page uses direct `fetch()` without:
   - Optimistic updates
   - Query cache invalidation
   - Proper error handling with rollback
5. Giveaway settings save exists but not using mutation pattern
6. Query keys already defined for guildSettings but not module-specific

## Requirements

### Functional
- FR-1: Add `useUpdateVoice(guildId)` mutation hook
- FR-2: Add `useUpdateMusic(guildId)` mutation hook
- FR-3: Add `useUpdateGiveawaySettings(guildId)` mutation hook
- FR-4: Wire Voice page save button to use mutation hook
- FR-5: Wire Giveaway settings save button to use mutation hook
- FR-6: Toast notifications on success/error

### Non-Functional
- NFR-1: Optimistic updates for instant UI feedback
- NFR-2: Rollback on error
- NFR-3: Query cache invalidation on success
- NFR-4: Consistent error messages across all mutations

## Architecture

```
use-mutations.ts
    |
    +-- createGuildMutation(guildId, config)
    |       |
    |       +-- mutationFn: PATCH /api/guilds/:id/:endpoint
    |       +-- onMutate: optimistic update
    |       +-- onError: rollback
    |       +-- onSuccess: toast
    |       +-- onSettled: invalidate queries
    |
    +-- useUpdateSettings()    // existing
    +-- useUpdateWelcome()     // existing
    +-- useUpdateLeveling()    // existing
    +-- useUpdateModeration()  // existing
    +-- useUpdateTickets()     // existing
    +-- useUpdateVoice()       // NEW
    +-- useUpdateMusic()       // NEW
    +-- useUpdateGiveawaySettings()  // NEW
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `apps/dashboard/src/hooks/use-mutations.ts` | Add 3 new mutation hooks |
| `apps/dashboard/src/lib/query-keys.ts` | Add module-specific query keys |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/voice/page.tsx` | Use mutation hook instead of fetch |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/giveaway/page.tsx` | Use mutation hook for settings |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/music/page.tsx` | Use mutation hook if exists |

## Implementation Steps

### Step 1: Extend Query Keys (15 min)

1. Update `apps/dashboard/src/lib/query-keys.ts`:

```typescript
export const queryKeys = {
  // ... existing keys

  // Module-specific settings
  guildVoice: (guildId: string) => ['guild', guildId, 'voice'] as const,
  guildMusic: (guildId: string) => ['guild', guildId, 'music'] as const,
  guildGiveawaySettings: (guildId: string) => ['guild', guildId, 'giveaways', 'settings'] as const,
} as const;
```

### Step 2: Extend Mutation Factory (30 min)

2. Update `apps/dashboard/src/hooks/use-mutations.ts`:

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';

type ApiEndpoint =
  | 'settings'
  | 'welcome'
  | 'leveling'
  | 'moderation'
  | 'tickets'
  | 'voice'
  | 'music'
  | 'giveaways/settings';

interface MutationConfig {
  endpoint: ApiEndpoint;
  successMessage: string;
  queryKeyFn?: (guildId: string) => readonly unknown[];
}

/**
 * Generic mutation factory for guild settings
 */
function createGuildMutation(guildId: string | null, config: MutationConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!guildId) throw new Error('No guild selected');

      const res = await fetch(`/api/guilds/${guildId}/${config.endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update');
      }

      return res.json();
    },
    onMutate: async (newData) => {
      if (!guildId) return;

      // Use module-specific query key if provided, otherwise fall back to settings
      const queryKey = config.queryKeyFn
        ? config.queryKeyFn(guildId)
        : queryKeys.guildSettings(guildId);

      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));

      return { previousData, queryKey };
    },
    onSuccess: () => {
      toast.success(config.successMessage);
    },
    onError: (_err, _newData, context) => {
      if (context?.queryKey && context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      if (guildId) {
        const queryKey = config.queryKeyFn
          ? config.queryKeyFn(guildId)
          : queryKeys.guildSettings(guildId);
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

// ═══════════════════════════════════════════════
// Existing Hooks
// ═══════════════════════════════════════════════

export function useUpdateSettings(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'settings',
    successMessage: 'Settings saved!',
  });
}

export function useUpdateWelcome(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'welcome',
    successMessage: 'Welcome settings saved!',
  });
}

export function useUpdateLeveling(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'leveling',
    successMessage: 'Leveling settings saved!',
  });
}

export function useUpdateModeration(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'moderation',
    successMessage: 'Moderation settings saved!',
  });
}

export function useUpdateTickets(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'tickets',
    successMessage: 'Ticket settings saved!',
  });
}

// ═══════════════════════════════════════════════
// NEW Hooks
// ═══════════════════════════════════════════════

export function useUpdateVoice(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'voice',
    successMessage: 'Voice settings saved!',
    queryKeyFn: queryKeys.guildVoice,
  });
}

export function useUpdateMusic(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'music',
    successMessage: 'Music settings saved!',
    queryKeyFn: queryKeys.guildMusic,
  });
}

export function useUpdateGiveawaySettings(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'giveaways/settings',
    successMessage: 'Giveaway settings saved!',
    queryKeyFn: queryKeys.guildGiveawaySettings,
  });
}
```

### Step 3: Wire Voice Page Save (45 min)

3. Update `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/voice/page.tsx`:

**Add import:**
```typescript
import { useUpdateVoice } from '@/hooks/use-mutations';
```

**Replace direct fetch with mutation:**

```typescript
// Remove these state variables:
// const [saving, setSaving] = useState(false);

// Add mutation hook:
const updateVoice = useUpdateVoice(selectedGuildId);

// Replace handleSave:
const handleSave = () => {
  updateVoice.mutate({
    tempVoiceEnabled: settings.tempVoiceEnabled,
    tempVoiceCreatorId: settings.tempVoiceCreatorId,
    tempVoiceCategoryId: settings.tempVoiceCategoryId,
    voiceDefaultLimit: settings.voiceDefaultLimit,
    voiceDefaultBitrate: settings.voiceDefaultBitrate,
    voiceDefaultRegion: settings.voiceDefaultRegion,
    voiceLockByDefault: settings.voiceLockByDefault,
    voiceAutoDeleteEmpty: settings.voiceAutoDeleteEmpty,
  });
};

// Update button disabled state:
<Button
  onClick={handleSave}
  disabled={updateVoice.isPending}
  className="..."
>
  {updateVoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  <Save className="mr-2 h-4 w-4" />
  Save Changes
</Button>
```

### Step 4: Wire Giveaway Settings Save (45 min)

4. Update `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/giveaway/page.tsx`:

**Add import:**
```typescript
import { useUpdateGiveawaySettings } from '@/hooks/use-mutations';
```

**Replace direct fetch:**

```typescript
// Add mutation hook (inside component):
const updateGiveawaySettings = useUpdateGiveawaySettings(guildId);

// Replace handleSaveSettings:
const handleSaveSettings = () => {
  updateGiveawaySettings.mutate(settings);
};

// Update button:
<Button
  onClick={handleSaveSettings}
  disabled={updateGiveawaySettings.isPending}
  className="..."
>
  {updateGiveawaySettings.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
  <Save className="mr-2 h-4 w-4" />
  Save Configuration
</Button>
```

### Step 5: Wire Music Page (if exists) (30 min)

5. Check if music page has settings and apply same pattern:

```typescript
import { useUpdateMusic } from '@/hooks/use-mutations';

const updateMusic = useUpdateMusic(guildId);

const handleSave = () => {
  updateMusic.mutate(settings);
};
```

### Step 6: Add Hooks Export (10 min)

6. Ensure hooks are exported from index (if using barrel exports):

Update `apps/dashboard/src/hooks/index.ts` if it exists:
```typescript
export * from './use-mutations';
```

## Todo List

- [ ] Add query keys for voice, music, giveaway settings
- [ ] Extend ApiEndpoint type with new endpoints
- [ ] Add queryKeyFn parameter to createGuildMutation
- [ ] Create useUpdateVoice hook
- [ ] Create useUpdateMusic hook
- [ ] Create useUpdateGiveawaySettings hook
- [ ] Refactor Voice page to use mutation hook
- [ ] Refactor Giveaway page settings to use mutation hook
- [ ] Refactor Music page to use mutation hook (if applicable)
- [ ] Test save functionality on each page
- [ ] Verify toast notifications appear
- [ ] Verify cache invalidation works

## Success Criteria

1. **Voice Save Works:** Click save on Voice page -> toast "Voice settings saved!"
2. **Giveaway Settings Save:** Click save on Giveaway settings tab -> toast appears
3. **Optimistic Updates:** UI updates immediately before API response
4. **Error Rollback:** If API fails, UI reverts to previous state
5. **No Direct Fetch:** No more `await fetch()` in handleSave functions

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API endpoint mismatch | High | Low | Verify existing API routes before wiring |
| Missing API routes | High | Medium | Check that PATCH endpoints exist for all modules |
| Optimistic update shape mismatch | Medium | Low | Ensure mutation data matches query cache shape |

## Security Considerations

- All mutations go through existing authenticated API routes
- CSRF protection should be verified on API routes
- No new endpoints introduced, only client-side changes

## Next Steps

After this phase:
1. Proceed to Phase 3 to add Redis publishers
2. The publishers will be called from API routes after successful saves
3. This enables bot to receive real-time config updates
