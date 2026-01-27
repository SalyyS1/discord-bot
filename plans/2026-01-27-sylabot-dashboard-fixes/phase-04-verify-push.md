# Phase 04: Verify & Push

> Parent: [plan.md](./plan.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 |
| Effort | 30 minutes |
| Risk | Low |

## Pre-Push Checklist

### 1. Type Check

```bash
pnpm typecheck
```

Expected: All packages pass

### 2. Lint

```bash
pnpm lint
```

Expected: No errors (warnings acceptable)

### 3. Build (Optional but Recommended)

```bash
pnpm build
```

Expected: All packages build successfully

## Manual Testing

### Test 1: Guild Switch

1. Open dashboard
2. Select Server A — note the settings shown
3. Switch to Server B
4. **Verify:** Server B settings appear immediately (no flash of A's data)
5. Switch back to A
6. **Verify:** Server A settings appear immediately

### Test 2: Settings Persistence

1. In dashboard, change a setting (e.g., welcome message)
2. Verify toast shows "Saved"
3. Restart bot: `pm2 restart bot` (on VPS, after push)
4. Refresh dashboard
5. **Verify:** Setting persists

### Test 3: Rebrand

1. Check dashboard title in browser tab → "SylaBot"
2. Run bot command `/info` → embed shows "SylaBot"
3. Check README → shows "SylaBot" and "SalyVn"

## Git Commit Strategy

Single commit with clear scope:

```bash
git add -A
git commit -m "fix(platform): dashboard sync, persistence, rebrand to SylaBot

BREAKING CHANGE: None

- fix(dashboard): proper query key namespacing for guild switch
- fix(dashboard): remove stale data on guild change
- fix(cache): verify DB-first pattern for persistence
- feat(rebrand): KisBot → SylaBot, author → SalyVn
- fix(security): token decryption only at spawn time (manager)"
```

## Push & Deploy

```bash
# Local
git push origin main
```

```bash
# On VPS
cd /path/to/sylabot
git pull origin main
pnpm install
pnpm build
pm2 restart all
```

## Rollback Plan

If issues found after deploy:

```bash
# On VPS
git log --oneline -5  # Find previous good commit
git revert HEAD
git push origin main

# Then on VPS
git pull
pnpm build
pm2 restart all
```

## Success Criteria

- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm lint` — 0 errors
- [ ] Guild switch — no stale data
- [ ] Settings persist after restart
- [ ] Rebrand complete
- [ ] Pushed to GitHub
- [ ] VPS deployment successful
