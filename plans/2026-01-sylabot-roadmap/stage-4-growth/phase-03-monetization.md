---
stage: "4"
phase: "03"
title: "Monetization"
status: complete
effort: 6h+
---

# Phase 4.3: Monetization

**Parent**: [Stage 4 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-4-growth/overview.md)

## Requirements (If Applicable)

1. Payment integration
2. License/subscription system
3. Feature gating
4. Billing portal

## Options

### Option A: Stripe
- Full control
- More implementation work
- Standard for SaaS

### Option B: Polar.sh
- Built for devtools
- Simpler integration
- License key based

### Option C: Patreon/Ko-fi
- External platform
- Less integration
- Community-focused

## Feature Gating

```typescript
async function checkPremium(guildId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { guildId },
  });
  return subscription?.status === 'active';
}

// In feature handler
if (!await checkPremium(guildId)) {
  return reply("This is a premium feature. Upgrade at sylabot.com/pricing");
}
```

## Dashboard Integration

- Upgrade prompts in dashboard
- Premium badge on guild
- Usage limit warnings

## Todo

- [ ] Decide on payment provider
- [ ] Implement subscription model
- [ ] Add feature gating
- [ ] Create billing portal
- [ ] Add upgrade prompts

## Success Criteria

- Revenue stream established
- Clear upgrade path for users
- No billing issues
