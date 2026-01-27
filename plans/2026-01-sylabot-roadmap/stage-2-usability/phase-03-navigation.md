---
stage: "2"
phase: "03"
title: "Navigation Clarity"
status: complete
effort: 2h
---

# Phase 2.3: Navigation Clarity

**Parent**: [Stage 2 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-2-usability/overview.md)

## Requirements

1. Guild context badge always visible
2. Active nav item highlighting
3. Breadcrumb navigation
4. Clear section headers

## Implementation

### Guild Context Badge

Always show current guild in header/sidebar:

```typescript
function GuildContextBadge() {
  const { selectedGuild } = useGuildContext();
  if (!selectedGuild) return null;
  
  return (
    <Badge className="flex items-center gap-2">
      <img src={selectedGuild.icon} className="h-4 w-4 rounded" />
      {selectedGuild.name}
    </Badge>
  );
}
```

### Active Nav Highlighting

```typescript
function NavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname.includes(href);
  
  return (
    <Link 
      href={href}
      className={cn(
        "nav-link",
        isActive && "bg-white/10 text-cyan-400"
      )}
    >
      {children}
    </Link>
  );
}
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/dashboard/src/components/guild-context-badge.tsx` | **NEW** |
| `apps/dashboard/src/components/breadcrumb.tsx` | **NEW** or update |
| `apps/dashboard/src/components/sidebar.tsx` | Add active highlighting |
| `apps/dashboard/src/components/dashboard-header.tsx` | Add guild badge |

## Todo

- [ ] Create guild context badge
- [ ] Add to dashboard header
- [ ] Implement active nav highlighting
- [ ] Add breadcrumb component

## Success Criteria

- User always knows which guild is selected
- Current page is clearly indicated in nav
