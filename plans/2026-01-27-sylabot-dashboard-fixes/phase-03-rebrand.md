# Phase 03: Safe Rebrand KisBot → SylaBot

> Parent: [plan.md](./plan.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P2 Medium |
| Effort | 1 hour |
| Risk | Low (code-only) |

## Scope

### In Scope ✅
- UI strings in dashboard
- Bot embed messages
- Dashboard metadata (title, description)
- README and public docs
- Package descriptions

### Out of Scope ❌
- Database data (tenant names, etc.)
- Database migrations
- Environment variable names
- Internal code identifiers
- File/folder names

## Search Strategy

```bash
# Step 1: Find all occurrences
grep -ri "kisbot" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . | grep -v node_modules | grep -v dist

grep -ri "KisBot" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . | grep -v node_modules | grep -v dist
```

## Implementation Steps

### Step 1: Dashboard Metadata

**File:** `apps/dashboard/src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: 'SylaBot Dashboard',
  description: 'Manage your SylaBot Discord bot',
  // ...
};
```

**File:** `apps/dashboard/public/manifest.json`
```json
{
  "name": "SylaBot Dashboard",
  "short_name": "SylaBot"
}
```

### Step 2: Dashboard UI Strings

Search and replace in:
- `apps/dashboard/src/components/` — any hardcoded "KisBot"
- `apps/dashboard/src/app/` — page titles, descriptions

### Step 3: Bot Embeds

**File:** `apps/bot/src/commands/general/info.ts`

```typescript
const embed = new EmbedBuilder()
  .setTitle('SylaBot')
  .setDescription('A powerful Discord bot by SalyVn')
  .setFooter({ text: 'SylaBot' });
```

**File:** `apps/bot/src/commands/general/help.ts` — same pattern

### Step 4: Package Descriptions

**Files:**
- `package.json` (root)
- `apps/*/package.json`
- `packages/*/package.json`

```json
{
  "description": "SylaBot - Discord Bot Platform"
}
```

### Step 5: README

**File:** `README.md`

```markdown
# SylaBot

A multi-tenant Discord bot platform.

**Author:** SalyVn
```

### Step 6: Author References

Search for existing author names and update to "SalyVn":
- `package.json` author field
- LICENSE file (if exists)
- Any copyright notices

## Verification Checklist

After changes, run search again:

```bash
# Should return 0 results (excluding changelogs, git history)
grep -ri "kisbot" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v dist | grep -v CHANGELOG
```

## Files to Modify

| File | Change |
|------|--------|
| `apps/dashboard/src/app/layout.tsx` | Title, metadata |
| `apps/dashboard/public/manifest.json` | App name |
| `apps/bot/src/commands/general/info.ts` | Embed content |
| `apps/bot/src/commands/general/help.ts` | Embed content |
| `README.md` | Project name, author |
| `package.json` (root) | Description, author |

## Rollback Safety

- All changes are string replacements in code
- No database changes
- `git revert` if issues found

## Success Criteria

- [ ] Dashboard shows "SylaBot" in title/metadata
- [ ] Bot embeds show "SylaBot" and "SalyVn"
- [ ] README updated
- [ ] No "KisBot" references remain in active code
