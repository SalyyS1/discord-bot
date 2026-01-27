---
stage: "1"
phase: "04"
title: "Rebrand"
status: complete
priority: P2
effort: 0.5h
---

# Phase 1.4: Safe Rebrand

**Parent**: [Stage 1 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/overview.md)

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| UI strings | Database data |
| Bot embeds | Package names |
| README | Environment variables |
| HTML metadata | Domain names |

## Search & Replace

```bash
grep -ri "kisbot" apps/ --include="*.tsx" --include="*.ts" --include="*.md"
```

Replace with "SylaBot" in user-facing locations only.

## Verification

```bash
# Should return 0 matches
grep -ri "kisbot" apps/ packages/ --include="*.ts" --include="*.tsx" | wc -l
```

## Todo

- [ ] Search all occurrences
- [ ] Replace in dashboard UI
- [ ] Replace in bot embeds
- [ ] Update README
- [ ] Verify grep returns 0

## Success Criteria

- "KisBot" nowhere in user-facing UI
- Dashboard header shows "SylaBot"
