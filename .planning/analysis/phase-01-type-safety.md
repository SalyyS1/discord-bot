# Phase 01: Type Safety Improvements

**Date:** 2026-01-27 | **Priority:** High | **Status:** Pending

---

## Context

45 instances of `any` type found across codebase, primarily in voice session handlers and interaction handlers. This reduces TypeScript's ability to catch bugs at compile time.

---

## Overview

| Metric           | Value     |
| ---------------- | --------- |
| Files Affected   | 12        |
| `any` Instances  | 45        |
| Estimated Effort | 3-4 hours |
| Risk Level       | Low       |

---

## Key Insights

- Most `any` usage is in `tempvoice` module
- Voice session objects lack proper type definitions
- Interaction handlers use `any` instead of discriminated unions

---

## Requirements

1. Create proper types for voice session objects
2. Replace `any` with specific types in all handlers
3. Use discriminated unions for interaction types
4. Maintain backward compatibility

---

## Related Code Files

```
apps/bot/src/modules/tempvoice/buttonHandler.ts    - 12 instances
apps/bot/src/commands/tempvoice/voice.ts           - 10 instances
apps/bot/src/commands/giveaway/start.ts            - 5 instances
apps/bot/src/modules/music/index.ts                - 4 instances
apps/bot/src/lib/health.ts                         - 2 instances
apps/dashboard/src/app/api/guilds/[guildId]/audit/route.ts - 3 instances
```

---

## Implementation Steps

### Step 1: Create Voice Session Type

```typescript
// packages/types/src/voice-session.ts
export interface VoiceSession {
  id: string;
  channelId: string;
  guildId: string;
  ownerId: string;
  name: string | null;
  userLimit: number;
  bitrate: number;
  locked: boolean;
  hidden: boolean;
  permitted: string[];
  rejected: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 2: Update Button Handler

Replace:

```typescript
async function handleLock(interaction: any, session: any) {
```

With:

```typescript
async function handleLock(
  interaction: ButtonInteraction,
  session: VoiceSession
) {
```

### Step 3: Create Interaction Union Types

```typescript
// packages/types/src/interactions.ts
import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
} from 'discord.js';

export type VoiceControlInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;
```

---

## Todo List

- [ ] Create `VoiceSession` type in `@repo/types`
- [ ] Create interaction union types
- [ ] Update `tempvoice/buttonHandler.ts` (12 fixes)
- [ ] Update `commands/tempvoice/voice.ts` (10 fixes)
- [ ] Update `commands/giveaway/start.ts` (5 fixes)
- [ ] Update `modules/music/index.ts` (4 fixes)
- [ ] Update `lib/health.ts` (2 fixes)
- [ ] Update audit route with proper Prisma types (3 fixes)
- [ ] Run `pnpm typecheck` to verify all fixes

---

## Success Criteria

- [ ] Zero `any` types in production code
- [ ] `pnpm typecheck` passes without errors
- [ ] All existing tests still pass
- [ ] No runtime behavior changes

---

## Risk Assessment

| Risk                         | Likelihood | Impact | Mitigation                       |
| ---------------------------- | ---------- | ------ | -------------------------------- |
| Type mismatch breaks runtime | Low        | Medium | Test all voice commands manually |
| Missing property access      | Low        | Low    | TypeScript will catch at compile |

---

## Security Considerations

- No security implications; purely type-level changes
- Types do not affect runtime behavior

---

## Next Steps

After completion:

1. Run full test suite
2. Test all voice commands manually
3. Move to Phase 02 (Deduplication)
