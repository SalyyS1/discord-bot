---
phase: 02
title: "Prometheus Metrics and Memory Monitoring"
status: complete
effort: 2.5h
completed: 2026-01-29
---

# Phase 02: Prometheus Metrics and Memory Monitoring

## Context Links

- [Rate Limiter](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/ratelimit.ts)
- [Circuit Breaker](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/circuit-breaker-for-redis.ts)
- [Memory Store](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/rate-limit-memory-fallback-store.ts)
- [Health Monitor](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/manager/src/health.ts)
- [Manager API](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/manager/src/api.ts)

## Overview

**Priority:** P2 - Short-term
**Status:** Pending (blocked by Phase 01)
**Description:** Add Prometheus metrics for rate limiting and circuit breaker. Extend health endpoint with memory store statistics.

## Key Insights

- `prom-client` is standard Node.js Prometheus client
- Circuit breaker already has `getState()` method
- Memory store has `getStats()` returning `{ size, maxSize }`
- Health endpoint exists at `/health` in manager API

## Requirements

### Functional
- Counter: `ratelimit_requests_total` with labels `{allowed, source}`
- Gauge: `circuit_breaker_state` (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
- Gauge: `ratelimit_memory_store_entries`
- Gauge: `ratelimit_memory_store_max_size`
- `/metrics` endpoint in manager API (Prometheus scrape target)
- Health endpoint includes memory store stats

### Non-Functional
- Minimal performance impact (counters are atomic)
- Standard Prometheus exposition format
- No breaking changes to existing APIs

## Architecture

```
Request Flow with Metrics:
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ checkRateLimit() │
│ ┌──────────────┐ │
│ │ ratelimit_   │◄──── Counter++
│ │ requests_    │ │
│ │ total        │ │
│ └──────────────┘ │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ CircuitBreaker   │
│ ┌──────────────┐ │
│ │ circuit_     │◄──── Gauge update on state change
│ │ breaker_     │ │
│ │ state        │ │
│ └──────────────┘ │
└──────────────────┘

Metrics Export:
┌─────────────┐     ┌────────────────┐
│  /metrics   │────►│  Prometheus    │
│  endpoint   │     │  Server        │
└─────────────┘     └────────────────┘
```

## Related Code Files

### To Modify
| File | Changes |
|------|---------|
| `packages/security/src/ratelimit.ts` | Add counter increments |
| `packages/security/src/circuit-breaker-for-redis.ts` | Add state gauge updates |
| `packages/security/src/rate-limit-memory-fallback-store.ts` | Export entry count gauge |
| `apps/manager/src/health.ts` | Add memory stats to getSummary() |
| `apps/manager/src/api.ts` | Add /metrics endpoint |
| `packages/security/package.json` | Add prom-client dependency |

### To Create
| File | Purpose |
|------|---------|
| `packages/security/src/metrics.ts` | Centralized Prometheus registry and metric definitions |

## Implementation Steps

### Step 1: Add prom-client Dependency (5min)

```bash
cd packages/security
pnpm add prom-client
```

### Step 2: Create Metrics Registry (20min)

Create `packages/security/src/metrics.ts`:

```typescript
/**
 * Prometheus Metrics for Security Package
 * Centralized registry for rate limiting and circuit breaker metrics
 */

import { Registry, Counter, Gauge, collectDefaultMetrics } from 'prom-client';

// Create dedicated registry (allows multiple apps to have separate metrics)
export const securityMetricsRegistry = new Registry();

// Collect default Node.js metrics (memory, CPU, etc.)
collectDefaultMetrics({ register: securityMetricsRegistry });

/**
 * Rate Limit Metrics
 */
export const rateLimitRequestsTotal = new Counter({
  name: 'ratelimit_requests_total',
  help: 'Total rate limit checks',
  labelNames: ['allowed', 'source'] as const,
  registers: [securityMetricsRegistry],
});

export const rateLimitRejectedTotal = new Counter({
  name: 'ratelimit_rejected_total',
  help: 'Total rate limited (rejected) requests',
  labelNames: ['key_prefix'] as const,
  registers: [securityMetricsRegistry],
});

/**
 * Circuit Breaker Metrics
 */
export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['name'] as const,
  registers: [securityMetricsRegistry],
});

export const circuitBreakerFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total circuit breaker recorded failures',
  labelNames: ['name'] as const,
  registers: [securityMetricsRegistry],
});

/**
 * Memory Fallback Store Metrics
 */
export const memoryStoreEntries = new Gauge({
  name: 'ratelimit_memory_store_entries',
  help: 'Current number of entries in memory fallback store',
  registers: [securityMetricsRegistry],
});

export const memoryStoreMaxSize = new Gauge({
  name: 'ratelimit_memory_store_max_size',
  help: 'Maximum size of memory fallback store',
  registers: [securityMetricsRegistry],
});

/**
 * Get all metrics in Prometheus exposition format
 */
export async function getMetrics(): Promise<string> {
  return securityMetricsRegistry.metrics();
}

/**
 * Get content type for metrics response
 */
export function getMetricsContentType(): string {
  return securityMetricsRegistry.contentType;
}

// State enum mapping for circuit breaker gauge
export const CIRCUIT_STATE_VALUES = {
  CLOSED: 0,
  HALF_OPEN: 1,
  OPEN: 2,
} as const;
```

### Step 3: Update Rate Limiter with Metrics (15min)

Update `packages/security/src/ratelimit.ts`:

```typescript
// Add import at top
import { rateLimitRequestsTotal, rateLimitRejectedTotal } from './metrics.js';

// In checkRateLimit(), after returning result, add:
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  // ... existing code ...

  // Record metrics (at end of function, before return)
  const result = /* existing result */;

  rateLimitRequestsTotal.inc({
    allowed: result.allowed ? 'true' : 'false',
    source: result.source,
  });

  if (!result.allowed) {
    const keyPrefix = key.split(':')[0] || 'unknown';
    rateLimitRejectedTotal.inc({ key_prefix: keyPrefix });
  }

  return result;
}
```

### Step 4: Update Circuit Breaker with Metrics (15min)

Update `packages/security/src/circuit-breaker-for-redis.ts`:

```typescript
// Add import at top
import { circuitBreakerState, circuitBreakerFailures, CIRCUIT_STATE_VALUES } from './metrics.js';

// In CircuitBreaker class, update state transitions:

private updateStateMetric(): void {
  circuitBreakerState.set(
    { name: 'redis' },
    CIRCUIT_STATE_VALUES[this.state]
  );
}

// Call updateStateMetric() after every state change:
// In canExecute() when transitioning to HALF_OPEN
// In recordSuccess() when transitioning to CLOSED
// In recordFailure() when transitioning to OPEN

recordFailure(): void {
  this.failures++;
  this.lastFailure = Date.now();
  circuitBreakerFailures.inc({ name: 'redis' });  // Add this line

  if (this.state === 'HALF_OPEN') {
    this.state = 'OPEN';
    this.updateStateMetric();  // Add this line
    console.warn('[CircuitBreaker] Circuit OPEN (failed in half-open)');
  } else if (this.failures >= this.config.failureThreshold) {
    this.state = 'OPEN';
    this.updateStateMetric();  // Add this line
    console.warn('[CircuitBreaker] Circuit OPEN (threshold exceeded)');
  }
}
```

### Step 5: Update Memory Store with Metrics (10min)

Update `packages/security/src/rate-limit-memory-fallback-store.ts`:

```typescript
// Add import at top
import { memoryStoreEntries, memoryStoreMaxSize } from './metrics.js';

// In constructor, set max size metric:
constructor(maxSize = 10000) {
  this.maxSize = maxSize;
  memoryStoreMaxSize.set(maxSize);  // Add this line
  this.startCleanup();
}

// Update entries gauge when store changes:
// In increment(), after this.store.set():
memoryStoreEntries.set(this.store.size);

// In evictIfNeeded(), after deletions:
memoryStoreEntries.set(this.store.size);

// In cleanup interval callback:
memoryStoreEntries.set(this.store.size);
```

### Step 6: Export Metrics from Package Index (5min)

Update `packages/security/src/index.ts`:

```typescript
// Add export
export { getMetrics, getMetricsContentType, securityMetricsRegistry } from './metrics.js';
```

### Step 7: Add Metrics Endpoint to Manager API (20min)

Update `apps/manager/src/api.ts`:

```typescript
import { getMetrics, getMetricsContentType } from '@repo/security';

// Add route (before other routes):
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', getMetricsContentType());
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});
```

### Step 8: Extend Health Endpoint with Memory Stats (20min)

Update `apps/manager/src/health.ts` - modify getSummary():

```typescript
import { memoryStore } from '@repo/security';

// Update getSummary() return type and implementation:
getSummary(): {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
  totalGuilds: number;
  memoryStore: { size: number; maxSize: number };
} {
  // ... existing code ...

  return {
    total: this.healthData.size,
    healthy,
    unhealthy,
    unknown,
    totalGuilds,
    memoryStore: memoryStore.getStats(),  // Add this
  };
}
```

### Step 9: Document CSRF Token Rotation (10min)

Already covered in Phase 01. Ensure completed.

## Todo List

- [x] Add `prom-client` to packages/security/package.json
- [x] Create `packages/security/src/prometheus-metrics-registry.ts` (renamed from metrics.ts)
- [x] Update ratelimit.ts with counter increments
- [x] Update circuit-breaker-for-redis.ts with state gauge
- [x] Update rate-limit-memory-fallback-store.ts with entry gauge
- [x] Export metrics from packages/security/src/index.ts
- [x] Add /metrics endpoint to apps/manager/src/api.ts
- [x] Update health.ts getSummary() with memory stats
- [⚠️] Test: curl /metrics returns Prometheus format (needs manual verification)
- [⚠️] Test: Rate limit triggers increment counter (needs manual verification)
- [⚠️] Test: Circuit breaker state reflected in gauge (needs manual verification)
- [⚠️] Test: Memory store size in health response (needs manual verification)

## Success Criteria

1. `GET /metrics` returns valid Prometheus exposition format
2. `ratelimit_requests_total` counter increments on each check
3. `circuit_breaker_state` gauge reflects actual state (0/1/2)
4. `ratelimit_memory_store_entries` shows current store size
5. Health endpoint response includes `memoryStore: { size, maxSize }`
6. All metrics have proper labels and help text

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance overhead | Low | Low | Counters are atomic, minimal impact |
| Metric cardinality explosion | Low | Medium | Fixed label values, no user IDs in labels |
| Breaking existing /health consumers | Low | Medium | Add new field, don't change existing |

## Security Considerations

- /metrics endpoint should be internal-only (not exposed publicly)
- No sensitive data in metric labels (no user IDs, tokens, etc.)
- Consider auth for /metrics if exposed

## Next Steps

After Phase 02 complete:
1. Configure Prometheus scrape target for manager
2. Create Grafana dashboard for security metrics
3. Set up alerting for circuit breaker OPEN state
4. Document metrics in ops runbook
