# Phase 7: Music System Overhaul

## Context Links

- [Music Page](apps/dashboard/src/app/[locale]/(dashboard)/dashboard/music/page.tsx)
- [Music API Route](apps/dashboard/src/app/api/guilds/[guildId]/music/route.ts)
- [Music Commands](apps/bot/src/commands/music/)

## Overview

**Priority:** P1 - Critical
**Status:** Pending
**Effort:** 8 hours

Fix all non-functional music commands, implement custom embeds for different platforms, and add personal/shared playlist features.

## Key Insights

1. Music page exists with settings UI (volume, DJ role, request channel)
2. Commands listed but reported as non-functional (CRITICAL)
3. Uses `useUpdateMusic` mutation hook (created in Phase 2)
4. No playlist management in current Dashboard
5. Music embeds need platform-specific styling (YouTube, Spotify, Apple)

## Requirements

### Functional
- FR-1: All music commands functional (/play, /pause, /skip, /stop, /queue, etc.)
- FR-2: YouTube-style embed for YouTube tracks
- FR-3: Spotify-style embed for Spotify tracks
- FR-4: Apple Music-style embed for Apple Music tracks
- FR-5: Personal playlists per user (CRUD operations)
- FR-6: Playlist sharing between users
- FR-7: Configure embed style from Discord bot commands

### Non-Functional
- NFR-1: Command response within 3 seconds
- NFR-2: Queue operations handle 500+ tracks
- NFR-3: Playlist limit: 100 playlists per user, 500 tracks per playlist

## Architecture

```
Music System:
Discord Command -> Bot Handler
    |
    v
Lavalink/Music Player
    |
    v
Embed Generator (platform-specific)
    |
    v
Discord Message (styled embed)

Playlist System:
Dashboard/Bot -> Playlist API
    |
    v
Prisma (User playlists, shared playlists)
    |
    v
Music Player (load playlist tracks)
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `apps/bot/src/commands/music/play.ts` | Fix playback, add platform detection |
| `apps/bot/src/commands/music/*.ts` | Fix all music commands |
| `apps/bot/src/services/music-embed-generator.ts` | Platform-specific embeds |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/music/page.tsx` | Add playlist management UI |

### Files to Create
| File | Purpose |
|------|---------|
| `apps/bot/src/embeds/youtube-music-embed.ts` | YouTube-style embed template |
| `apps/bot/src/embeds/spotify-music-embed.ts` | Spotify-style embed template |
| `apps/bot/src/embeds/apple-music-embed.ts` | Apple Music-style embed template |
| `apps/dashboard/src/app/api/user/playlists/route.ts` | User playlist CRUD API |
| `apps/dashboard/src/components/music/playlist-manager.tsx` | Playlist management component |

### Database Changes
| Table | Changes |
|-------|---------|
| `Playlist` | New table: id, userId, name, isPublic, tracks, createdAt |
| `PlaylistShare` | New table: playlistId, sharedWithId, permission |

## Implementation Steps

### Step 1: Debug Music Commands (2 hours)

1. Identify root cause of command failures
2. Check Lavalink connection/configuration
3. Fix player initialization and state management
4. Test each command individually
5. Add error logging for troubleshooting

### Step 2: Platform Detection & Embed Generator (1.5 hours)

1. Detect track source (YouTube, Spotify, Apple, SoundCloud)
2. Create embed template per platform with appropriate colors/styling
3. Extract relevant metadata (thumbnail, duration, artist)
4. Implement `generateMusicEmbed(track, platform)` function

### Step 3: Platform-Specific Embeds (1 hour)

1. YouTube embed: Red accent, video thumbnail, channel name
2. Spotify embed: Green accent, album art, artist info
3. Apple Music embed: Pink gradient, album art, artist
4. Generic fallback for other sources

### Step 4: Playlist Database Schema (30 min)

1. Add Playlist model to Prisma schema
2. Add PlaylistShare model for sharing
3. Run migration

### Step 5: Playlist API Routes (1 hour)

1. `GET /api/user/playlists` - List user playlists
2. `POST /api/user/playlists` - Create playlist
3. `PUT /api/user/playlists/:id` - Update playlist
4. `DELETE /api/user/playlists/:id` - Delete playlist
5. `POST /api/user/playlists/:id/share` - Share playlist

### Step 6: Dashboard Playlist UI (1.5 hours)

1. Create playlist manager component
2. Add/edit/delete playlist forms
3. Track list with reorder capability
4. Share dialog with user search
5. Import from URL (YouTube playlist, Spotify playlist)

### Step 7: Bot Playlist Commands (30 min)

1. `/playlist create <name>`
2. `/playlist add <track>`
3. `/playlist play <name>`
4. `/playlist share <user>`

## Todo List

- [ ] Debug and fix Lavalink connection
- [ ] Fix /play command
- [ ] Fix /pause, /resume commands
- [ ] Fix /skip, /stop commands
- [ ] Fix /queue, /nowplaying commands
- [ ] Fix /volume, /seek commands
- [ ] Implement platform detection
- [ ] Create YouTube embed template
- [ ] Create Spotify embed template
- [ ] Create Apple Music embed template
- [ ] Add Playlist table to schema
- [ ] Add PlaylistShare table to schema
- [ ] Implement playlist API routes
- [ ] Create PlaylistManager dashboard component
- [ ] Implement playlist bot commands
- [ ] Test end-to-end music flow

## Success Criteria

1. **Commands Work:** All music commands respond and function correctly
2. **Platform Embeds:** Each platform shows distinct, styled embed
3. **Playlists:** Users can create, edit, share, and play playlists
4. **Performance:** Queue handles 500+ tracks without issues

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Lavalink server issues | Critical | Medium | Health checks, auto-reconnect |
| Platform API changes | High | Low | Abstract platform adapters |
| Spotify API auth | Medium | Medium | Token refresh, caching |
| Large playlist load time | Medium | Low | Lazy loading, pagination |

## Security Considerations

- Playlist visibility respects isPublic flag
- Share permissions validated server-side
- No direct file access, stream through Lavalink
- Rate limit music commands to prevent abuse

## Next Steps

After this phase:
1. Music system fully functional
2. Phase 8 (Ticket System) can proceed
