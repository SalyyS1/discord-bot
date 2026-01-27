---
stage: "4"
phase: "01"
title: "Documentation Site"
status: in-progress
effort: 6h
---

# Phase 4.1: Documentation Site

**Parent**: [Stage 3 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-4-growth/overview.md)

## Requirements

1. ~~Standalone docs site (Docusaurus/Nextra)~~ **Using Nextra**
2. All features documented
3. Searchable
4. Mobile responsive

## Doc Structure

```
docs/
├── getting-started/
│   ├── installation.md
│   ├── first-setup.md
│   └── permissions.md
├── features/
│   ├── leveling.md
│   ├── tickets.md
│   ├── giveaways.md
│   ├── temp-voice.md
│   ├── welcome.md
│   └── moderation.md
├── dashboard/
│   ├── overview.md
│   ├── settings.md
│   └── troubleshooting.md
└── api/
    └── reference.md (future)
```

## Per-Feature Doc Template

```markdown
# Feature Name

## Overview
What it does, why use it.

## Quick Start
1. Enable in dashboard
2. Configure basic settings
3. Test it works

## Configuration
| Setting | Description | Default |
|---------|-------------|---------|

## Commands
| Command | Description |
|---------|-------------|

## FAQ
Common questions and answers.

## Troubleshooting
Common issues and fixes.
```

## Todo

- [ ] Set up Docusaurus/Nextra
- [ ] Write getting started guides
- [ ] Document all features
- [ ] Add search functionality
- [ ] Deploy to subdomain (docs.sylabot.com)

## Success Criteria

- All features have documentation
- Docs are searchable
- Support load reduced
