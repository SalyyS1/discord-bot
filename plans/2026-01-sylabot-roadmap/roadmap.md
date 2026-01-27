---
title: "SylaBot Product Roadmap"
description: "Full product roadmap from stability to growth - 4 stages"
status: in-progress
priority: P1
effort: 6w
branch: main
tags: [roadmap, product, stability, ux, growth]
created: 2026-01-27
---

# SylaBot Product Roadmap

## Vision

Transform SylaBot from "it works" → "it's usable" → "it feels professional" → "it scales".

## Architecture Principles (Non-Negotiable)

| Rule | Description |
|------|-------------|
| **PostgreSQL = Source of Truth** | All reads fall back to DB |
| **Redis = Cache Only** | Empty Redis is valid state |
| **Query Keys = Guild-Scoped** | `['guild', guildId, 'resource']` |
| **Pub/Sub = Cache Invalidation** | Dashboard → Pub/Sub → Bot invalidates |

---

## Roadmap Overview

| Stage | Goal | Timeline | Status |
|-------|------|----------|--------|
| **1. Stability** | "It works" | Week 1 | [→ Details](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/overview.md) |
| **2. Usability** | "It's usable" | Week 2-3 | [→ Details](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-2-usability/overview.md) |
| **3. Clarity** | "It feels professional" | Week 4-5 | [→ Details](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-3-clarity/overview.md) |
| **4. Growth** | "It scales" | Week 6+ | [→ Details](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-4-growth/overview.md) |

---

## Stage Dependency

```
Stability → Usability → Clarity → Growth
   ↓            ↓           ↓         ↓
 Works      Pleasant    Premium   Scalable
```

---

## Quick Links

### Stage 1: Stability
- Cache discipline, query keys, sync, rebrand

### Stage 2: Usability  
- Loading states, error handling, navigation, forms

### Stage 3: Clarity
- Landing page, pricing, onboarding, profile

### Stage 4: Growth
- Documentation, analytics, monetization

---

## Success Metrics

| Stage | Metric |
|-------|--------|
| Stability | Zero stale data on guild switch |
| Usability | Zero "undefined" or blank screens |
| Clarity | New user onboards in < 5 minutes |
| Growth | Self-service, reduced support load |
