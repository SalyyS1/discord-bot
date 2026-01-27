# Phase 04: Error Handling & UX

**Effort:** 30min | **Priority:** MEDIUM | **Status:** Pending

## Overview

Improve error handling across API routes and ensure the UI displays meaningful messages when Discord data cannot be fetched.

## Requirements

- [ ] Handle "bot not in guild" gracefully
- [ ] Show meaningful error messages in selectors
- [ ] Add retry logic for transient failures
- [ ] Improve loading states

## Related Files

| File                                                           | Action                     |
| -------------------------------------------------------------- | -------------------------- |
| `apps/dashboard/src/lib/session.ts`                            | Check - ApiResponse helper |
| `apps/dashboard/src/components/selectors/channel-selector.tsx` | Modify - error states      |
| `apps/dashboard/src/components/selectors/role-selector.tsx`    | Modify - error states      |
| `apps/dashboard/src/hooks/use-guild-channels.ts`               | Modify - error handling    |
| `apps/dashboard/src/hooks/use-guild-roles.ts`                  | Modify - error handling    |

## Implementation Steps

### Step 1: Extend ApiResponse helper

**File:** `apps/dashboard/src/lib/session.ts` (or wherever ApiResponse is defined)

Add new error response types if not exists:

```typescript
export const ApiResponse = {
  success: <T>(data: T) => NextResponse.json({ success: true, data }),

  error: (message: string, status: number = 400) =>
    NextResponse.json({ success: false, error: message }, { status }),

  serverError: (message = 'Internal server error') =>
    NextResponse.json({ success: false, error: message }, { status: 500 }),

  // New helpers
  forbidden: (message = 'Bot does not have access to this guild') =>
    NextResponse.json({ success: false, error: message, code: 'BOT_NO_ACCESS' }, { status: 403 }),

  rateLimited: (retryAfter?: number) =>
    NextResponse.json(
      {
        success: false,
        error: 'Rate limited. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter,
      },
      { status: 429 }
    ),

  serviceUnavailable: (message = 'Bot not configured for this guild') =>
    NextResponse.json(
      { success: false, error: message, code: 'SERVICE_UNAVAILABLE' },
      { status: 503 }
    ),
};
```

### Step 2: Update React Query hooks with retry logic

**File:** `apps/dashboard/src/hooks/use-guild-channels.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface ChannelApiResponse {
  success: boolean;
  data?: Channel[];
  error?: string;
  code?: string;
}

async function fetchGuildChannels(guildId: string): Promise<Channel[]> {
  const res = await fetch(`/api/guilds/${guildId}/channels`);
  const json: ChannelApiResponse = await res.json();

  if (!res.ok || !json.success) {
    const error = new Error(json.error || 'Failed to fetch channels');
    (error as any).code = json.code;
    (error as any).status = res.status;
    throw error;
  }

  return json.data || [];
}

export function useGuildChannels(guildId: string | null) {
  return useQuery({
    queryKey: queryKeys.guildChannels(guildId),
    queryFn: () => fetchGuildChannels(guildId!),
    enabled: !!guildId,
    staleTime: 60_000, // 1 minute
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (bot not in guild) or 503 (no token)
      if (error.status === 403 || error.status === 503) return false;
      // Retry transient errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
```

**File:** `apps/dashboard/src/hooks/use-guild-roles.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface RoleApiResponse {
  success: boolean;
  data?: Role[];
  error?: string;
  code?: string;
}

async function fetchGuildRoles(guildId: string): Promise<Role[]> {
  const res = await fetch(`/api/guilds/${guildId}/roles`);
  const json: RoleApiResponse = await res.json();

  if (!res.ok || !json.success) {
    const error = new Error(json.error || 'Failed to fetch roles');
    (error as any).code = json.code;
    (error as any).status = res.status;
    throw error;
  }

  return json.data || [];
}

export function useGuildRoles(guildId: string | null) {
  return useQuery({
    queryKey: queryKeys.guildRoles(guildId),
    queryFn: () => fetchGuildRoles(guildId!),
    enabled: !!guildId,
    staleTime: 5 * 60_000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error.status === 403 || error.status === 503) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
```

### Step 3: Update selectors with error states

**File:** `apps/dashboard/src/components/selectors/channel-selector.tsx`

Add error state rendering:

```tsx
// In component body, after useGuildChannels hook
const { data: channels, isLoading, error, isError } = useGuildChannels(guildId);

// Render error state
if (isError) {
  const errorCode = (error as any)?.code;

  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>
          {errorCode === 'BOT_NO_ACCESS'
            ? 'Bot does not have access to this server'
            : errorCode === 'SERVICE_UNAVAILABLE'
              ? 'Bot not configured for this server'
              : 'Failed to load channels'}
        </span>
      </div>
      {errorCode !== 'BOT_NO_ACCESS' && (
        <button onClick={() => refetch()} className="mt-2 text-xs underline hover:no-underline">
          Try again
        </button>
      )}
    </div>
  );
}
```

**File:** `apps/dashboard/src/components/selectors/role-selector.tsx`

Similar error state rendering:

```tsx
if (isError) {
  const errorCode = (error as any)?.code;

  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>
          {errorCode === 'BOT_NO_ACCESS'
            ? 'Bot does not have access to this server'
            : 'Failed to load roles'}
        </span>
      </div>
    </div>
  );
}
```

### Step 4: Add loading skeleton

If not already present, add a loading skeleton state:

```tsx
if (isLoading) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading channels...</span>
    </div>
  );
}
```

## Error Code Reference

| Code                  | HTTP Status | Meaning            | User Message                              |
| --------------------- | ----------- | ------------------ | ----------------------------------------- |
| `BOT_NO_ACCESS`       | 403         | Bot not in guild   | "Bot does not have access to this server" |
| `RATE_LIMITED`        | 429         | Discord rate limit | "Rate limited. Please try again later."   |
| `SERVICE_UNAVAILABLE` | 503         | No bot token       | "Bot not configured for this server"      |
| -                     | 500         | Server error       | "Failed to load channels/roles"           |

## Todo List

- [ ] Add error code support to ApiResponse
- [ ] Update useGuildChannels with retry logic
- [ ] Update useGuildRoles with retry logic
- [ ] Add error state UI to ChannelSelector
- [ ] Add error state UI to RoleSelector
- [ ] Improve loading states
- [ ] Test error scenarios

## Success Criteria

- [ ] Users see clear messages when bot lacks access
- [ ] Retry button appears for transient errors
- [ ] No retry on permanent errors (403, 503)
- [ ] Loading states are clear and not jarring

## UX Considerations

1. **Bot not in guild** - Show invite link?
2. **Rate limited** - Show countdown timer?
3. **Empty channels** - Distinguish from error

## Risk Assessment

| Risk                     | Likelihood | Impact | Mitigation                 |
| ------------------------ | ---------- | ------ | -------------------------- |
| Error messages confusing | Medium     | Low    | Clear, actionable messages |
| Retry causes rate limit  | Low        | Low    | Limit retry attempts       |
| Loading state too long   | Low        | Medium | Show after 300ms delay     |

## Notes

- Consider adding toast notifications for errors
- May want to log client-side errors to analytics
- Invite link generation could be added later
