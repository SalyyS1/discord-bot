# Security Audit Report - Discord Bot Multi-Tenant Platform

**Date:** 2026-01-28
**Reviewer:** code-reviewer agent
**Scope:** Security aspects of Discord bot codebase at `/mnt/d/Project/.2_PROJECT_BOT_DISCORD`

---

## Executive Summary

Reviewed multi-tenant Discord bot platform with focus on token handling, input validation, permission checks, anti-spam/anti-link implementation, database security, and Redis security. Overall security posture is **good** with several critical areas properly implemented but **5 high-priority vulnerabilities** identified requiring immediate attention.

**Risk Rating:** MEDIUM-HIGH
**Critical Issues:** 0
**High Priority:** 5
**Medium Priority:** 4
**Low Priority:** 3

---

## Scope Reviewed

**Files analyzed:** 20+ security-critical files
**Focus areas:**
1. Token handling in multi-tenant system
2. Input validation in commands
3. Permission checks in moderation
4. Anti-spam/anti-link security
5. Database query security (SQL injection)
6. Redis security
7. Rate limiting
8. Encryption implementation

---

## Critical Issues

None identified.

---

## High Priority Findings

### H1: SQL Injection via Unsafe Raw Queries in Schema Manager

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/database/src/schema-manager.ts`
**Lines:** 31, 48

**Issue:**
Uses `$executeRawUnsafe` with template string interpolation for CREATE/DROP schema operations:

```typescript
await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
```

While validation exists (`isValidSchemaName`), relying on regex validation before raw SQL is risky. If validation bypassed, SQL injection possible.

**Impact:** Critical - potential schema manipulation, data loss
**Recommendation:**
- Use Prisma's parameterized queries (`$queryRaw` with tagged templates)
- Or use PostgreSQL identifier escaping: `pg_catalog.quote_ident()`
- Add additional boundary checks before schema operations
- Consider whitelist approach for valid tenant IDs

**Example fix:**
```typescript
// Use Prisma's safe parameterization
await this.prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS ${Prisma.raw(schemaName)}`;
```

---

### H2: Hard-coded Salt in Encryption Service

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/encryption.ts`
**Line:** 11

**Issue:**
Static salt used for key derivation:
```typescript
const SALT = 'kisbot-tenant-encryption-v1';
```

Hard-coded salt weakens key derivation. If encryption key leaked, attacker can derive encryption keys for all tenants using known salt.

**Impact:** High - reduces encryption strength
**Recommendation:**
- Use unique per-encryption IV (already done ✓)
- Generate random salt per installation or per tenant
- Store salt securely in environment variable or secure vault
- Rotate salt periodically with re-encryption strategy

---

### H3: Missing Input Sanitization in Anti-Link Whitelist

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/bot/src/modules/security/antiLink.ts`
**Lines:** 94-96, 114-116

**Issue:**
Domain validation is basic and may allow bypass via Unicode, homograph attacks, or malformed URLs:

```typescript
const cleanDomain = domain
  .toLowerCase()
  .replace(/^(https?:\/\/)?(www\.)?/, '')
  .split('/')[0];

if (!cleanDomain.includes('.')) {
  // reject
}
```

No validation for:
- Punycode/IDN homograph attacks (e.g., `аpple.com` with Cyrillic 'а')
- IP addresses disguised as domains
- Double-encoded URLs
- Unicode characters

**Impact:** Medium-High - whitelist bypass could allow malicious links
**Recommendation:**
- Use proper URL parsing with validation library (e.g., `validator.js`)
- Normalize Unicode/punycode domains
- Validate TLD against known list
- Reject IP addresses if domain-only whitelist intended
- Add length limits

**Example:**
```typescript
import validator from 'validator';

if (!validator.isFQDN(cleanDomain, { require_tld: true })) {
  return error;
}
```

---

### H4: Rate Limiting Fails Open on Redis Error

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/ratelimit.ts`
**Lines:** 65-74

**Issue:**
When Redis unavailable, rate limiting fails open (allows all requests):

```typescript
} catch (error) {
  // If Redis fails, allow the request but log error
  return {
    allowed: true,
    remaining: limit,
    resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
    limit,
  };
}
```

**Impact:** High - abuse possible during Redis outage
**Recommendation:**
- Implement fail-closed approach for critical endpoints
- Use in-memory rate limiting fallback (already partially implemented for anti-spam)
- Add circuit breaker pattern to prevent Redis connection storms
- Alert on Redis failures
- Consider different policies per endpoint (critical vs non-critical)

---

### H5: Missing Authorization Check in Manager API

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/manager/src/api.ts`
**Lines:** 48-285

**Issue:**
Manager API endpoints (`/bots/*`) have no authentication/authorization middleware. Any client with network access can start/stop bots:

```typescript
app.post('/bots/:tenantId/start', asyncHandler<TenantParams>(async (req, res) => {
  // No auth check!
  const tenantId = req.params.tenantId;
```

Only CORS enabled, no API key validation or authentication.

**Impact:** Critical if exposed - unauthorized bot control
**Recommendation:**
- Add API key authentication middleware
- Validate `MANAGER_API_KEY` from env on all endpoints
- Use mTLS for internal service communication
- Restrict network access via firewall/VPC
- Add request signing for inter-service calls

**Example:**
```typescript
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.MANAGER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(authMiddleware);
```

---

## Medium Priority Improvements

### M1: Token Validation Timeout Missing

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/validator.ts`
**Lines:** 31-35

**Issue:**
Discord API fetch has no timeout, can hang indefinitely:
```typescript
const response = await fetch('https://discord.com/api/v10/users/@me', {
  headers: {
    Authorization: `Bot ${token}`,
  },
});
```

**Recommendation:**
Add timeout using AbortController:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);
const response = await fetch(url, {
  signal: controller.signal,
  headers: { Authorization: `Bot ${token}` }
});
clearTimeout(timeoutId);
```

---

### M2: Audit Logs Silently Fail

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/audit.ts`
**Lines:** 49-64

**Issue:**
Audit logging failures caught and ignored:
```typescript
} catch (error) {
  console.error('[Audit] Failed to log audit entry:', error);
}
```

Missing critical security events if DB unavailable.

**Recommendation:**
- Queue audit logs to Redis/message queue on DB failure
- Alert on audit failures (CloudWatch, Sentry)
- Implement retry logic with exponential backoff
- Consider write-ahead log for critical events

---

### M3: Incomplete Input Validation in Commands

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/bot/src/commands/moderation/ban.ts`
**Lines:** 31-33

**Issue:**
User input (reason) not sanitized before database storage:
```typescript
const reason = interaction.options.getString('reason') ?? 'No reason provided';
```

Could allow injection of malicious content into logs/embeds.

**Recommendation:**
- Add max length validation (e.g., 500 chars)
- Sanitize special characters for embed safety
- Validate against common injection patterns
- Use Zod schema validation for all command inputs

---

### M4: Missing HTTPS Enforcement in Environment

**File:** `.env.example`
**Lines:** 27-28

**Issue:**
No guidance on HTTPS enforcement for dashboard URLs:
```
NEXTAUTH_URL="https://dashboard.sylabot.io"
```

**Recommendation:**
- Add comment enforcing HTTPS in production
- Add middleware to redirect HTTP → HTTPS
- Set `secure` flag on all cookies
- Enable HSTS headers

---

## Low Priority Suggestions

### L1: Hardcoded Regex in Anti-Spam Needs Extraction

**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/bot/src/modules/security/antiLink.ts`
**Lines:** 8-13

Regex patterns hardcoded. Extract to config for easier updates/testing.

---

### L2: Missing Security Headers

Dashboard should implement security headers:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

### L3: Improve Error Messages (Information Disclosure)

Avoid leaking internal details in errors:
```typescript
error: `Failed to start bot: ${message}` // Exposes internal errors
```

Return generic messages to clients, log detailed errors server-side.

---

## Positive Observations (Security Strengths)

✅ **AES-256-GCM encryption** properly implemented for tokens
✅ **Unique IV per encryption** prevents pattern analysis
✅ **Role hierarchy checks** in moderation commands prevent privilege escalation
✅ **Prisma ORM** used throughout - prevents most SQL injection
✅ **Rate limiting** implemented with Redis + memory fallback
✅ **Audit logging** for security events (tenant operations)
✅ **Permission bypass** for Manage Messages in anti-spam/anti-link
✅ **Zod validation** used in API routes
✅ **Token format validation** before API calls
✅ **Memory cleanup** in anti-spam (prevents memory leaks)

---

## Database Security Assessment

**Status:** GOOD

- ✅ Prisma ORM prevents SQL injection in 99% of queries
- ✅ Parameterized queries used correctly
- ⚠️ Raw SQL limited to 4 locations (health checks + schema management)
- ⚠️ Schema validation exists but needs hardening (see H1)
- ✅ Database credentials encrypted in storage
- ✅ Per-tenant schema isolation implemented

---

## Redis Security Assessment

**Status:** FAIR

- ✅ Redis used only for rate limiting + caching (non-sensitive data)
- ✅ Memory fallback prevents complete failure
- ⚠️ No Redis authentication configured in example
- ⚠️ No TLS for Redis connections
- ⚠️ Rate limiting fails open on Redis errors (see H4)

**Recommendations:**
- Enable Redis AUTH: `REDIS_URL="redis://:password@localhost:6379"`
- Use TLS: `rediss://` protocol
- Configure `maxmemory-policy` for LRU eviction
- Restrict Redis network access

---

## Multi-Tenant Token Security Assessment

**Status:** GOOD

- ✅ Tokens encrypted at rest with AES-256-GCM
- ✅ Tokens never logged or exposed in API responses
- ✅ Token validation before storage
- ✅ Encrypted tokens stored in database
- ✅ Decryption happens only in isolated bot process
- ⚠️ Hard-coded salt weakens key derivation (see H2)
- ✅ Token rotation logged in audit trail

---

## Recommended Actions (Priority Order)

1. **URGENT** - Add authentication to Manager API (H5)
2. **HIGH** - Fix SQL injection in schema manager (H1)
3. **HIGH** - Implement fail-closed rate limiting (H4)
4. **HIGH** - Remove hard-coded encryption salt (H2)
5. **MEDIUM** - Improve domain whitelist validation (H3)
6. **MEDIUM** - Add fetch timeouts to token validation (M1)
7. **MEDIUM** - Implement audit log retry queue (M2)
8. **LOW** - Add security headers to dashboard (L2)
9. **LOW** - Sanitize command inputs (M3)

---

## Security Checklist Compliance

| Category | Status | Notes |
|----------|--------|-------|
| Input Validation | ⚠️ PARTIAL | Commands validated, whitelist needs work |
| Output Encoding | ✅ PASS | Discord embeds properly escaped |
| Authentication | ⚠️ PARTIAL | Manager API missing auth |
| Authorization | ✅ PASS | Role hierarchy enforced |
| Encryption | ✅ PASS | AES-256-GCM properly used |
| SQL Injection | ⚠️ PARTIAL | Mostly safe, schema manager risky |
| XSS Prevention | ✅ PASS | N/A for bot, dashboard uses React |
| CSRF Protection | ✅ PASS | Better-auth handles it |
| Rate Limiting | ⚠️ PARTIAL | Fails open on errors |
| Audit Logging | ✅ PASS | Comprehensive logging |
| Secret Management | ✅ PASS | Env vars, encrypted storage |
| Error Handling | ⚠️ PARTIAL | Some info disclosure |

---

## Unresolved Questions

1. Is Manager API exposed publicly or internal-only?
2. What's the Redis persistence/backup strategy?
3. Are there rate limits on Discord API calls to prevent quota exhaustion?
4. Is there a secrets rotation policy for TENANT_ENCRYPTION_KEY?
5. What's the incident response plan for compromised tenant tokens?
6. Are audit logs retained long-term or pruned?

---

## Conclusion

Codebase demonstrates solid security fundamentals with proper encryption, ORM usage, and permission checks. Main concerns:

- **Manager API lacks authentication** (critical if exposed)
- **Rate limiting fails open** during Redis outages
- **SQL injection risk** in schema operations (low likelihood but high impact)
- **Hard-coded crypto salt** weakens encryption

Recommend addressing H1-H5 before production deployment. Overall security posture is above-average for Discord bot projects but needs hardening for multi-tenant production use.

**Next Steps:**
1. Fix high-priority issues
2. Conduct penetration testing
3. Implement security monitoring/alerting
4. Document incident response procedures
5. Regular security audits (quarterly)
