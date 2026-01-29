---
title: "Security Production Readiness"
description: "Implement security hardening for production deployment - env validation, secrets, metrics"
status: complete
priority: P1
effort: 4h
branch: main
tags: [security, production, monitoring, hardening]
created: 2026-01-29
completed: 2026-01-29
---

# Security Production Readiness Plan

## Overview

Address security findings from code review to ensure production readiness.
Two phases: immediate env validation + short-term metrics/monitoring.

## Phases

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [01](./phase-01-env-validation-and-secrets.md) | Startup validation for security env vars + secrets generation | 45min | ✅ complete |
| [02](./phase-02-metrics-and-monitoring.md) | Prometheus metrics for rate limiting + memory monitoring | 2.5h | ✅ complete |

## Key Dependencies

- `prom-client` package for Prometheus metrics (Phase 02)
- No external dependencies for Phase 01

## Architecture Changes

```
packages/security/src/
├── ratelimit.ts              # Add Prometheus counters
├── circuit-breaker-for-redis.ts  # Add state gauge
├── rate-limit-memory-fallback-store.ts  # Add memory stats export
└── metrics.ts                # NEW: Centralized metrics registry

apps/manager/src/
├── index.ts                  # Add env validation
├── health.ts                 # Extend with memory stats
└── api.ts                    # Add /metrics endpoint

apps/dashboard/src/
├── lib/env-validation.ts     # NEW: Server-side env check
└── lib/csrf-utils.ts         # Document rotation strategy
```

## Success Criteria

1. Manager/Dashboard fail-fast on missing security env vars
2. `.env.example` has key generation scripts documented
3. Rate limit hits/misses exposed as Prometheus counters
4. Circuit breaker state exposed as Prometheus gauge
5. Memory store size visible in health endpoint
6. CSRF rotation documented in code comments

## Not In Scope (Long-term)

- Legacy encryption deprecation (v1 -> v2)
- CSP nonce support (Next.js 15+ not stable)
- WAF integration

---

## Validation Summary

**Validated:** 2026-01-29
**Questions asked:** 4

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Env validation failure behavior | `process.exit(1)` - fail-fast, block all startup |
| /metrics endpoint authentication | No auth - internal network only |
| Default Node.js metrics | Yes, include `collectDefaultMetrics()` |
| Enforcement timing | Immediately on deploy - breaking change accepted |

### Action Items

- [x] Plan already uses `process.exit(1)` - no changes needed
- [x] Plan already has `/metrics` without auth - no changes needed
- [x] Plan already includes `collectDefaultMetrics()` - no changes needed
- [ ] **Ops team notification**: Existing deployments must have env vars set before update
