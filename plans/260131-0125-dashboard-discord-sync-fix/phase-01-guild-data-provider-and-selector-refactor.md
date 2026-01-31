# Phase 1: GuildDataProvider & Selector Refactor

## Context Links

- [Brainstorm Report](../reports/brainstorm-260131-0125-dashboard-discord-root-cause-fix.md)
- [Selector Analysis](./research/researcher-01-select-components-analysis.md)
- Current GuildContext: `apps/dashboard/src/context/guild-context.tsx`
- ChannelSelector: `apps/dashboard/src/components/selectors/channel-selector.tsx`
- RoleSelector: `apps/dashboard/src/components/selectors/role-selector.tsx`

## Overview

**Priority:** P1 - Critical
**Status:** Completed
**Effort:** 3 hours

Create a centralized GuildDataProvider that fetches channels/roles once per guild, eliminating duplicate API calls from individual selector components.

## Key Insights

1. `GuildContext` only manages `selectedGuildId`, not data
2. `ChannelSelector` and `RoleSelector` have internal `useEffect` fetch logic
3. Existing hooks `useGuildChannels` and `useGuildRoles` use TanStack Query with proper caching
4. Multiple selectors on same page trigger duplicate fetches
5. CategorySelector component does not exist (needed for voice setup)

## Requirements

### Functional
- FR-1: Single source of truth for guild channels/roles per page
- FR-2: Selectors consume context data, fallback to props for flexibility
- FR-3: CategorySelector component for selecting category channels
- FR-4: Loading/error states propagate from provider to selectors

### Non-Functional
- NFR-1: No duplicate API calls for same guild data
- NFR-2: TanStack Query caching preserved (1min channels, 5min roles)
- NFR-3: Backward compatible - existing prop-based usage still works

## Architecture

```
GuildDataProvider (wraps dashboard layout)
    |
    +-- useGuildChannels(selectedGuildId)  // TanStack Query
    +-- useGuildRoles(selectedGuildId)     // TanStack Query
    |
    v
GuildDataContext.Provider
    |
    +-- channels: Channel[]
    +-- roles: Role[]
    +-- categories: Channel[] (filtered type='category')
    +-- isLoading: boolean
    +-- error: Error | null
    +-- refetch: () => void
```

### Consumer Flow

```
ChannelSelector
    |
    +-- const { channels } = useGuildData()
    +-- If propChannels provided, use propChannels (override)
    +-- Else use context channels
    +-- Remove internal useEffect fetch logic
```

## Related Code Files

### Files to Create
| File | Purpose |
|------|---------|
| `apps/dashboard/src/context/guild-data-provider.tsx` | New context providing channels/roles |

### Files to Modify
| File | Changes |
|------|---------|
| `apps/dashboard/src/components/selectors/channel-selector.tsx` | Remove internal fetch, consume context |
| `apps/dashboard/src/components/selectors/role-selector.tsx` | Remove internal fetch, consume context |
| `apps/dashboard/src/app/[locale]/(dashboard)/layout.tsx` | Wrap with GuildDataProvider |

### Files to Create (New Component)
| File | Purpose |
|------|---------|
| `apps/dashboard/src/components/selectors/category-selector.tsx` | New category selector component |

## Implementation Steps

### Step 1: Create GuildDataProvider Context (30 min)

1. Create `apps/dashboard/src/context/guild-data-provider.tsx`:

```typescript
'use client';

import { createContext, useContext, useMemo } from 'react';
import { useGuildContext } from './guild-context';
import { useGuildChannels } from '@/hooks/use-guild-channels';
import { useGuildRoles } from '@/hooks/use-guild-roles';
import type { Channel } from '@/types/api';
import type { Role } from '@/hooks/use-guild-roles';

interface GuildDataContextType {
  channels: Channel[];
  roles: Role[];
  categories: Channel[];
  textChannels: Channel[];
  voiceChannels: Channel[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetchChannels: () => void;
  refetchRoles: () => void;
}

const GuildDataContext = createContext<GuildDataContextType | null>(null);

export function GuildDataProvider({ children }: { children: React.ReactNode }) {
  const { selectedGuildId } = useGuildContext();

  const channelsQuery = useGuildChannels(selectedGuildId);
  const rolesQuery = useGuildRoles(selectedGuildId);

  const value = useMemo(() => {
    const channels = channelsQuery.data ?? [];
    return {
      channels,
      roles: rolesQuery.data ?? [],
      categories: channels.filter(c => c.type === 'category'),
      textChannels: channels.filter(c => c.type === 'text'),
      voiceChannels: channels.filter(c => c.type === 'voice'),
      isLoading: channelsQuery.isLoading || rolesQuery.isLoading,
      isError: channelsQuery.isError || rolesQuery.isError,
      error: channelsQuery.error || rolesQuery.error,
      refetchChannels: channelsQuery.refetch,
      refetchRoles: rolesQuery.refetch,
    };
  }, [channelsQuery, rolesQuery]);

  return (
    <GuildDataContext.Provider value={value}>
      {children}
    </GuildDataContext.Provider>
  );
}

export function useGuildData() {
  const context = useContext(GuildDataContext);
  if (!context) {
    throw new Error('useGuildData must be used within GuildDataProvider');
  }
  return context;
}

// Optional hook that doesn't throw - for components that may be used outside provider
export function useGuildDataOptional() {
  return useContext(GuildDataContext);
}
```

### Step 2: Update Dashboard Layout (15 min)

2. Modify `apps/dashboard/src/app/[locale]/(dashboard)/layout.tsx`:
   - Import `GuildDataProvider`
   - Wrap children with provider inside `GuildProvider`

```typescript
import { GuildDataProvider } from '@/context/guild-data-provider';

// In the layout component, wrap children:
<GuildProvider>
  <GuildDataProvider>
    {children}
  </GuildDataProvider>
</GuildProvider>
```

### Step 3: Refactor ChannelSelector (45 min)

3. Update `apps/dashboard/src/components/selectors/channel-selector.tsx`:

**Remove:**
- `const [fetchedChannels, setFetchedChannels] = useState<Channel[]>([]);`
- `const [loading, setLoading] = useState(false);`
- The entire `useEffect` that fetches channels

**Add:**
```typescript
import { useGuildDataOptional } from '@/context/guild-data-provider';

// Inside component:
const guildData = useGuildDataOptional();

// Replace: const channels = propChannels || fetchedChannels;
// With:
const channels = propChannels ?? guildData?.channels ?? [];
const loading = !propChannels && !guildData && !!guildId; // Only show loading if no data source
```

**Keep backward compatibility:**
- If `channels` prop provided, use it directly
- If context available, use context data
- If neither and `guildId` provided, fall back to internal fetch (for edge cases)

### Step 4: Refactor RoleSelector (45 min)

4. Update `apps/dashboard/src/components/selectors/role-selector.tsx`:

Same pattern as ChannelSelector:
- Import `useGuildDataOptional`
- Remove internal fetch `useEffect`
- Use context roles with prop fallback
- Maintain backward compatibility

### Step 5: Create CategorySelector (30 min)

5. Create `apps/dashboard/src/components/selectors/category-selector.tsx`:

```typescript
'use client';

import { useState, useMemo } from 'react';
import { Folder, Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGuildDataOptional } from '@/context/guild-data-provider';
import type { Channel } from '@/components/selectors/channel-selector';

interface CategorySelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  categories?: Channel[];
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  categories: propCategories,
  placeholder = 'Select category',
  disabled = false,
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const guildData = useGuildDataOptional();

  const categories = propCategories ?? guildData?.categories ?? [];
  const isLoading = !propCategories && guildData?.isLoading;

  const filtered = useMemo(() => {
    if (!categories?.length) return [];
    if (!searchQuery) return categories;
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const selectedCategory = categories.find(c => c.id === value);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-white/10 bg-black/40">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading categories...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-black/40 border-white/10 text-white">
        <SelectValue placeholder={placeholder}>
          {selectedCategory && (
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-gray-400" />
              <span className="text-white">{selectedCategory.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-white/10">
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-black/40 border-white/10 text-sm text-white"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            No categories found
          </div>
        ) : (
          filtered.map((category) => (
            <SelectItem key={category.id} value={category.id} className="text-white hover:bg-white/10">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-gray-400" />
                <span>{category.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
```

### Step 6: Export from Selectors Index (15 min)

6. Update or create `apps/dashboard/src/components/selectors/index.ts`:

```typescript
export { ChannelSelector, MultiChannelSelector, type Channel } from './channel-selector';
export { RoleSelector, MultiRoleSelector, type Role } from './role-selector';
export { CategorySelector } from './category-selector';
```

## Todo List

- [x] Create `guild-data-provider.tsx` context file
- [x] Update dashboard layout to wrap with GuildDataProvider
- [x] Refactor ChannelSelector to consume context
- [x] Refactor RoleSelector to consume context
- [x] Create CategorySelector component
- [x] Update selectors index exports
- [ ] Test on Voice page (uses both channel types + category)
- [ ] Test on Giveaway page (uses channels + roles)
- [ ] Verify no duplicate network requests in DevTools

## Success Criteria

1. **Single Fetch:** Opening Voice page triggers 1 channels call + 1 roles call (not 2+ of each)
2. **Selector Works:** All selectors populate with correct data
3. **Backward Compatible:** Pages passing props directly still work
4. **Category Selection:** Voice page can select category for temp channels

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing selector usage | High | Low | Keep prop-based fallback, use `useGuildDataOptional` |
| Context not available in some pages | Medium | Low | Optional hook returns null, component handles gracefully |
| TanStack Query cache conflicts | Low | Low | Using same queryKeys, no conflict |

## Security Considerations

- No new API endpoints introduced
- Uses existing authenticated fetch endpoints
- Data access already gated by guild membership check

## Next Steps

After this phase:
1. Proceed to Phase 2 to add mutation hooks for Voice/Music/Giveaway
2. The refactored selectors will work correctly when save functionality is added
