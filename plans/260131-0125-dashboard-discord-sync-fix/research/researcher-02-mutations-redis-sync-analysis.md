# Research: Mutations & Redis Sync Patterns

**Date:** 2026-01-31

## Mutation Factory Pattern

### `use-mutations.ts`
- `createGuildMutation(guildId, config)` factory
- PATCH to `/api/guilds/:guildId/:endpoint`
- Optimistic updates via TanStack Query
- Toast notifications on success/error
- Query invalidation on settled

### Current Coverage
| Endpoint | Hook | Status |
|----------|------|--------|
| settings | useUpdateSettings | ✅ |
| welcome | useUpdateWelcome | ✅ |
| leveling | useUpdateLeveling | ✅ |
| moderation | useUpdateModeration | ✅ |
| tickets | useUpdateTickets | ✅ |
| voice | - | ❌ Missing |
| music | - | ❌ Missing |
| giveaways/settings | - | ❌ Missing |

## Redis Pub/Sub Pattern

### Dashboard → Bot (`configSync.ts`)
- Uses `ioredis` singleton
- `ConfigPublisher` from `@repo/config`
- Methods: publishWelcome, publishModeration, publishLeveling, publishAutoResponder, publishTempVoice
- Missing: Giveaway, Tickets, Music publishers

### Bot Subscriber (`bot-redis-command-subscriber.ts`)
- Subscribes to `bot_commands` channel
- Routes via `commandHandlers` Map
- Logs commands and errors

### Bot → Dashboard (`bot-redis-event-publisher.ts`)
- Publishes to `discord_events` channel
- Event types: MEMBER_JOIN, MEMBER_LEAVE, TICKET_CREATE, etc.
- `RedisPublisherService` class

## Gap Analysis
1. Missing mutation hooks for Voice, Music, Giveaway
2. Missing publishers for Giveaway, Tickets, Music
3. Dashboard doesn't listen to `discord_events` channel
4. No query invalidation on bot events

## Recommended Additions

### Dashboard
- Add `useUpdateVoice`, `useUpdateMusic`, `useUpdateGiveawaySettings` hooks
- Add `publishGiveawayUpdate`, `publishTicketUpdate`, `publishMusicUpdate`
- Subscribe to `discord_events` via WebSocket, invalidate queries

### Bot
- Subscribe to new config channels
- Publish events when giveaways/tickets created via Discord

## Unresolved
- ConfigPublisher exact implementation in `packages/config`
- Channel naming convention details
