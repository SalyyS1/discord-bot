# Code Review: Rate Limiting & API Edge Cases

## Scope
- **Files reviewed**: 5 files
  - `packages/security/src/ratelimit.ts` (240 lines)
  - `packages/security/src/rate-limit-memory-fallback-store.ts` (131 lines)
  - `packages/security/src/circuit-breaker-for-redis.ts` (137 lines)
  - `apps/manager/src/middleware/api-key-auth-middleware.ts` (66 lines)
  - `apps/manager/src/api.ts` (323 lines)
- **Lines analyzed**: ~857 lines
- **Focus**: Edge case handling, security vulnerabilities, fail-safe mechanisms
- **Git status**: No recent changes to reviewed files (clean working tree)

## Overall Assessment
Code implements sophisticated rate limiting with circuit breaker and memory fallback. Security middleware uses HMAC-SHA256 signatures. However, **6 critical edge cases remain unhandled or partially handled**, exposing potential security and availability risks.

## Critical Issues

### 1. Memory Fallback Store Overflow - ❌ UNHANDLED
**Location**: `packages/security/src/rate-limit-memory-fallback-store.ts:19-23, 76-94`

**Issue**: LRU eviction insufficient during high load
- Max size: 10,000 entries (line 19)
- Eviction only when `size >= maxSize` (line 76)
- Under sustained Redis failure with 1000 tenants @ 100 req/min = 100k entries/min
- Eviction removes only 10% (1000 entries) when full (line 88-90)
- Store will hit max capacity repeatedly, causing FIFO behavior instead of true LRU

**Impact**: Memory exhaustion, incorrect rate limit enforcement

**Recommendation**:
```typescript
// In constructor, add aggressive cleanup during Redis outages
constructor(maxSize = 50000) { // Increase capacity
  this.maxSize = maxSize;
  this.cleanupInterval = 30000; // More aggressive cleanup (30s)
  memoryStoreMaxSize.set(maxSize);
  this.startCleanup();
}

// Add warning when approaching capacity
private evictIfNeeded(): void {
  const capacityPercent = (this.store.size / this.maxSize) * 100;
  if (capacityPercent > 80) {
    console.warn(`[MemoryStore] At ${capacityPercent}% capacity (${this.store.size}/${this.maxSize})`);
  }

  if (this.store.size < this.maxSize) return;

  const now = Date.now();
  // Remove ALL expired entries first
  for (const [key, entry] of this.store) {
    if (entry.expiresAt <= now) {
      this.store.delete(key);
    }
  }

  // If still at capacity, remove 20% oldest (more aggressive)
  if (this.store.size >= this.maxSize) {
    const toRemove = Math.ceil(this.maxSize * 0.2);
    const sortedEntries = Array.from(this.store.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt); // True LRU
    sortedEntries.slice(0, toRemove).forEach(([key]) => this.store.delete(key));
  }
}
```

---

### 2. Circuit Breaker Shared Across All Tenants - ⚠️ PARTIAL
**Location**: `packages/security/src/circuit-breaker-for-redis.ts:136`, `packages/security/src/ratelimit.ts:96-97`

**Issue**: Single Redis failure opens circuit for ALL tenants
- `redisCircuitBreaker` is singleton (line 136 of circuit-breaker)
- When Redis fails, `canExecute()` returns false globally (ratelimit.ts:96)
- ALL tenants fall back to memory store simultaneously
- Creates thundering herd problem

**Impact**: One tenant's Redis issue affects all tenants

**Current Mitigation**: Memory fallback prevents total outage (partial protection)

**Recommendation**: Implement per-tenant circuit breakers
```typescript
// In circuit-breaker-for-redis.ts
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getBreaker(tenantId: string): CircuitBreaker {
    if (!this.breakers.has(tenantId)) {
      this.breakers.set(tenantId, new CircuitBreaker({}, `redis-${tenantId}`));
    }
    return this.breakers.get(tenantId)!;
  }
}

export const redisCircuitBreakerRegistry = new CircuitBreakerRegistry();

// In ratelimit.ts
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const tenantId = key.split(':')[0]; // Extract tenant from key
  const breaker = redisCircuitBreakerRegistry.getBreaker(tenantId);

  if (!breaker.canExecute()) {
    return handleFallback(key, limit, windowSeconds, failClosed, 'Circuit breaker OPEN');
  }
  // ... rest of implementation
}
```

---

### 3. Rate Limit Fail-Open for API Access - ❌ CRITICAL SECURITY ISSUE
**Location**: `packages/security/src/ratelimit.ts:221-228`

**Issue**: `canAccessApi` uses `failClosed: false` allowing unlimited requests during Redis outages
- Line 226: `{ failClosed: false }` returns `allowed: true, source: 'bypass'` when Redis fails
- 100 req/min limit becomes infinite during Redis downtime
- Enables DoS attacks by forcing Redis failures

**Impact**: Complete rate limit bypass, API abuse, resource exhaustion

**Recommendation**: Change to fail-closed with reasonable memory limit
```typescript
export async function canAccessApi(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `api:access:${userId}`,
    100, // 100 requests
    60, // per minute
    { failClosed: true } // CRITICAL: Must fail-closed to prevent abuse
  );
}
```

**Note**: Comment on line 219 "Non-critical - prefer availability" is **incorrect assessment**. API rate limits ARE security-critical.

---

### 4. MANAGER_API_KEY Missing Returns 500 - ⚠️ PARTIAL
**Location**: `apps/manager/src/middleware/api-key-auth-middleware.ts:39-46`

**Issue**: Returns 500 during runtime instead of failing at startup
- Line 39: Checks `process.env.MANAGER_API_KEY` on every request
- Line 41-45: Returns 500 "Server configuration error"
- Should validate env var during app initialization

**Impact**: Poor error visibility, confusing error messages to API clients

**Current Mitigation**: Logs error to console (line 41)

**Recommendation**: Add startup validation
```typescript
// In apps/manager/src/index.ts or api.ts initialization
function validateEnvironment(): void {
  const required = ['MANAGER_API_KEY', 'DATABASE_URL', 'REDIS_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Call before starting server
validateEnvironment();
const app = createApi(spawner, healthMonitor);
```

---

### 5. Signature Buffer Length Mismatch Throws - ❌ UNHANDLED
**Location**: `apps/manager/src/middleware/api-key-auth-middleware.ts:56`

**Issue**: `crypto.timingSafeEqual` requires equal-length buffers
- Line 56: Throws error if `signature.length !== expectedSignature.length`
- Attacker sends short/long signature → uncaught exception → 500 error
- No try-catch around `timingSafeEqual`

**Impact**: Denial of service via malformed signatures

**Recommendation**: Add length validation before timing-safe comparison
```typescript
// Replace lines 55-62 with:
const signatureBuffer = Buffer.from(signature, 'hex');
const expectedBuffer = Buffer.from(expectedSignature, 'hex');

// Validate length first (constant time not needed for length check)
if (signatureBuffer.length !== expectedBuffer.length) {
  console.warn(`[API Auth] Invalid signature length for ${req.method} ${req.path}`);
  return res.status(401).json({
    success: false,
    error: 'Invalid signature'
  });
}

// Now safe to use timingSafeEqual
if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
  console.warn(`[API Auth] Invalid signature for ${req.method} ${req.path}`);
  return res.status(401).json({
    success: false,
    error: 'Invalid signature'
  });
}
```

---

### 6. Metrics Endpoint Unprotected - ⚠️ DOCUMENTED RISK
**Location**: `apps/manager/src/api.ts:52-61`

**Issue**: `/metrics` endpoint bypasses authentication middleware
- Line 37: `app.use(apiKeyAuthMiddleware)` applied globally
- Line 12-14 in middleware: `/health` and `/health/summary` exempted
- Line 52: `/metrics` registered BEFORE middleware, skips auth
- Comment (line 52): "no auth - internal network only"

**Impact**: Information disclosure if exposed to internet

**Current Mitigation**:
- ✅ Documented assumption of internal network deployment
- ✅ Metrics contain operational data, not secrets

**Risk Level**: Medium (depends on network architecture)

**Recommendation**: Add network-level firewall rules OR conditional auth
```typescript
// Option 1: Add to middleware exemptions (if truly internal-only)
if (req.path === '/health' || req.path === '/health/summary' || req.path === '/metrics') {
  return next();
}

// Option 2: Add IP allowlist for metrics
const METRICS_ALLOWED_IPS = process.env.METRICS_ALLOWED_IPS?.split(',') || ['127.0.0.1'];

app.get('/metrics', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  if (!METRICS_ALLOWED_IPS.includes(clientIp)) {
    return res.status(403).send('Forbidden');
  }

  try {
    const metrics = await getMetrics();
    res.set('Content-Type', getMetricsContentType());
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});
```

---

## High Priority Findings

### Memory Store Lacks Circuit Breaker Integration
**Location**: `packages/security/src/rate-limit-memory-fallback-store.ts`

Memory store has no awareness of circuit breaker state. During HALF_OPEN testing, both Redis and memory store may be checked, causing inconsistent rate limit enforcement.

**Recommendation**: Add circuit breaker awareness to memory store or ensure clear handoff logic.

---

### No Rate Limit for Memory Fallback Operations
**Location**: `packages/security/src/ratelimit.ts:64-76`

When falling back to memory store, no rate limit on fallback switch rate. Rapid Redis connect/disconnect cycles could cause thrashing between Redis and memory stores.

**Recommendation**: Add exponential backoff or minimum fallback duration (e.g., stay on memory store for at least 60 seconds after Redis failure).

---

## Medium Priority Improvements

### Missing Input Validation on Rate Limit Parameters
**Location**: `packages/security/src/ratelimit.ts:86-91`

No validation that `limit > 0`, `windowSeconds > 0`, or reasonable upper bounds.

**Recommendation**:
```typescript
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  if (limit <= 0 || windowSeconds <= 0) {
    throw new Error('Invalid rate limit parameters: limit and window must be positive');
  }
  if (limit > 100000) {
    console.warn(`[RateLimit] Unusually high limit: ${limit} for key ${key}`);
  }
  // ... rest of implementation
}
```

---

### HMAC Timestamp Window Too Broad
**Location**: `apps/manager/src/middleware/api-key-auth-middleware.ts:28-36`

5-minute window (line 31) is generous for replay attack prevention. Industry standard is 30-60 seconds.

**Recommendation**: Reduce to 60 seconds
```typescript
if (isNaN(requestTime) || Math.abs(now - requestTime) > 60 * 1000) { // 60 seconds
  return res.status(401).json({
    success: false,
    error: 'Request expired'
  });
}
```

---

### No Cleanup on Memory Store Destroy
**Location**: `packages/security/src/rate-limit-memory-fallback-store.ts:114-119`

`destroy()` method clears interval and map but doesn't prevent new operations. If code continues to use destroyed store, silent failures occur.

**Recommendation**:
```typescript
private destroyed = false;

increment(key: string, windowSeconds: number): number {
  if (this.destroyed) {
    throw new Error('MemoryRateLimitStore has been destroyed');
  }
  // ... rest of implementation
}

destroy(): void {
  this.destroyed = true;
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval);
  }
  this.store.clear();
}
```

---

## Low Priority Suggestions

### Inconsistent Error Handling Patterns
- `ratelimit.ts:141` logs error but continues with fallback (good)
- `api.ts:314` logs error and returns 500 (good)
- `api-key-auth-middleware.ts:41` logs error and returns 500 (good)
Pattern is consistent across reviewed files.

---

### Magic Numbers in Circuit Breaker Config
**Location**: `packages/security/src/circuit-breaker-for-redis.ts:36-38`

Hardcoded values should be configurable via environment variables:
- `failureThreshold: 5`
- `resetTimeout: 30000` (30s)
- `halfOpenRequests: 3`

**Recommendation**: Add env var support with current values as defaults.

---

## Positive Observations

1. **Comprehensive Prometheus Metrics**: Rate limits, circuit breaker state, memory store size all tracked (ratelimit.ts:10, 127-135)
2. **Timing-Safe Comparison**: Proper use of `crypto.timingSafeEqual` prevents timing attacks (api-key-auth-middleware.ts:56)
3. **Graceful Degradation**: Memory fallback prevents total service failure during Redis outages (ratelimit.ts:44-77)
4. **HMAC Signature**: Uses SHA-256 with method:path:timestamp payload, strong cryptographic integrity (api-key-auth-middleware.ts:48-53)
5. **Clear Separation of Concerns**: Circuit breaker, rate limiter, memory store properly separated
6. **Detailed Logging**: All failure modes logged with context

---

## Recommended Actions

### Immediate (Before Production)
1. **FIX CRITICAL**: Change `canAccessApi` to `failClosed: true` (ratelimit.ts:226)
2. **FIX CRITICAL**: Add buffer length validation before `timingSafeEqual` (api-key-auth-middleware.ts:56)
3. **FIX HIGH**: Increase memory store capacity to 50k entries and implement true LRU (rate-limit-memory-fallback-store.ts:19)
4. **ADD**: Startup environment variable validation for `MANAGER_API_KEY`

### Short-term (Next Sprint)
5. **IMPLEMENT**: Per-tenant circuit breakers to isolate Redis failures
6. **REDUCE**: HMAC timestamp window from 5min to 60s
7. **ADD**: IP allowlist for `/metrics` endpoint or document firewall requirements
8. **ADD**: Rate limit parameter validation

### Long-term (Technical Debt)
9. **CONSIDER**: Distributed rate limiting with Redis Cluster for HA
10. **CONSIDER**: Circuit breaker config via environment variables
11. **ADD**: Comprehensive integration tests for all edge cases

---

## Metrics

- **Type Coverage**: TypeScript fully typed (no `any` except in generic handlers)
- **Security Issues**: 2 critical, 3 medium, 1 low
- **Error Handling**: Generally comprehensive, 3 gaps identified
- **Code Quality**: High - clear structure, good documentation
- **LOC per file**: Avg 171 lines (well-modularized)

---

## Unresolved Questions

1. What is expected behavior when memory store reaches capacity during sustained Redis outage affecting all tenants?
2. Is `/metrics` endpoint deployed behind internal firewall or exposed to public internet?
3. Are there monitoring alerts for circuit breaker state transitions?
4. What is acceptable rate limit enforcement accuracy during Redis failover (current: memory store has separate counters)?
5. Should rate limits persist across Redis reconnections or reset on circuit breaker close?
