# Phase 8: Ticket System Fixes

## Context Links

- [Tickets Page](apps/dashboard/src/app/[locale]/(dashboard)/dashboard/tickets/page.tsx)
- [Tickets API Route](apps/dashboard/src/app/api/guilds/[guildId]/tickets/route.ts)
- [Panel Sender](apps/dashboard/src/components/panels/panel-sender.tsx)
- [Realtime Tickets Hook](apps/dashboard/src/hooks/use-realtime-tickets.ts)

## Overview

**Priority:** P1 - Critical
**Status:** Pending
**Effort:** 4 hours

Fix embed auto-reset after ticket creation, resolve select component binding issues, and sync Discord-created tickets to Dashboard.

## Key Insights

1. Ticket page is large (28k+ tokens) indicating complex implementation
2. Panel sender component handles sending ticket embeds to Discord
3. Realtime tickets hook exists for polling updates
4. Select components bound to previous embed block new ticket creation
5. Discord-created tickets not appearing in Dashboard

## Requirements

### Functional
- FR-1: Embed auto-resets after ticket creation (fresh state)
- FR-2: Select components unbind from previous embed properly
- FR-3: New tickets can be created without page refresh
- FR-4: Discord-created tickets appear in Dashboard within 30 seconds
- FR-5: Ticket history persists and is queryable

### Non-Functional
- NFR-1: Ticket sync latency < 30 seconds
- NFR-2: No stale component state after operations
- NFR-3: Dashboard shows accurate ticket counts

## Architecture

```
Ticket Creation Flow (Dashboard):
Panel Config -> Send to Discord
    |
    v
Discord Message (embed + select)
    |
    v
User Interaction -> Bot creates ticket
    |
    v
Bot publishes to Redis -> Dashboard polls

Ticket Creation Flow (Discord):
/ticket command or button click
    |
    v
Bot creates ticket -> Save to DB
    |
    v
Publish to Redis channel
    |
    v
Dashboard receives via polling/SSE
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/tickets/page.tsx` | Fix state reset, component unbinding |
| `apps/dashboard/src/components/panels/panel-sender.tsx` | Reset state after send success |
| `apps/bot/src/events/ticket-created.ts` | Publish ticket event to Redis |
| `apps/dashboard/src/hooks/use-realtime-tickets.ts` | Subscribe to ticket events |

### Files to Create
| File | Purpose |
|------|---------|
| `packages/config/src/sync/ticket-events.ts` | Ticket event Redis channel definitions |

## Implementation Steps

### Step 1: Fix Panel Sender State Reset (45 min)

1. Identify state variables that persist after panel send
2. Add `resetForm()` function called on successful send
3. Clear embed config, channel selection, category selection
4. Clear any cached message IDs

### Step 2: Fix Select Component Binding (1 hour)

1. Investigate how select components store message ID reference
2. Ensure component ID generation is unique per panel send
3. Clear old component registrations after ticket created
4. Prevent old select options from interfering with new embeds

### Step 3: Implement Ticket Event Publishing (45 min)

1. Create ticket events Redis channel in packages/config
2. In bot ticket creation handler, publish event:
   ```ts
   {
     type: 'TICKET_CREATED',
     guildId, ticketId, userId, category, timestamp
   }
   ```
3. Add event for ticket close, reopen, delete

### Step 4: Dashboard Ticket Subscription (1 hour)

1. Update `use-realtime-tickets.ts` to handle new event types
2. Add subscription to ticket events channel
3. On event received, invalidate tickets query
4. Update ticket list/count in real-time

### Step 5: Ticket History Persistence (30 min)

1. Verify tickets saved to database on creation
2. Add transcript storage for closed tickets
3. Ensure history queryable with filters (status, date, user)

## Todo List

- [ ] Add resetForm function to panel-sender.tsx
- [ ] Call resetForm on successful panel send
- [ ] Debug select component ID generation
- [ ] Ensure unique component IDs per panel
- [ ] Clear component registrations after ticket created
- [ ] Create ticket-events.ts Redis channel config
- [ ] Add TICKET_CREATED event publishing in bot
- [ ] Add TICKET_CLOSED event publishing
- [ ] Update use-realtime-tickets.ts for new events
- [ ] Verify ticket history queries work
- [ ] Test embed reset flow
- [ ] Test Discord ticket appears in Dashboard

## Success Criteria

1. **Auto Reset:** After creating ticket, embed form is clean/empty
2. **No Blocking:** New panels can be sent without interference
3. **Discord Sync:** Tickets created via Discord appear in Dashboard < 30s
4. **History:** All tickets (Dashboard + Discord created) visible in history

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Complex state management | High | Medium | Use React state reset patterns |
| Component ID collisions | Medium | Low | UUID-based component IDs |
| Redis connection drops | Medium | Low | Reconnection logic, polling fallback |
| Large ticket volume | Low | Low | Pagination in queries |

## Security Considerations

- Ticket access gated by guild membership
- Only ticket creator and staff can view ticket content
- Transcript storage encrypted at rest
- PII in tickets handled per privacy policy

## Next Steps

After this phase:
1. Ticket system fully functional
2. Phase 9 (Giveaway Enhancements) can proceed
