# Security Review: Next.js Dashboard

**Date**: 2026-01-28
**Reviewer**: code-reviewer (Subagent a15ee19)
**Scope**: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/`
**Focus**: Authentication, Authorization, XSS, CSRF, Rate Limiting, Session Management

---

## Executive Summary

Dashboard implements Discord OAuth via better-auth with reasonable session management. Guild access control uses Discord permissions (MANAGE_GUILD). Found **1 Critical XSS vulnerability**, **2 High-priority issues** (missing CSRF protection, missing security headers), and several medium-priority improvements needed.

---

## Critical Issues

### 1. XSS Vulnerability in Message Preview (CRITICAL)
**File**: `src/app/[locale]/(dashboard)/dashboard/messages/page.tsx:1196,1212,1218,1230,1250`

**Issue**: Using `dangerouslySetInnerHTML` with user-controlled input after DOMPurify sanitization. While DOMPurify is present, sanitization config removes ALL tags but then manually re-inserts HTML via string replacement.

**Evidence**:
```typescript
// Line 656-660: Strips all HTML tags
const sanitized = DOMPurify.sanitize(text, {
  ALLOWED_TAGS: [], // Removes malicious scripts
  ALLOWED_ATTR: [],
});

// Line 663-690: But then re-adds HTML via replace()
.replace(/\{user\}/g, '<span class="text-blue-400">@JohnDoe</span>')
.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

// Line 1196: Rendered with dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: renderPreview(config.content) }} />
```

**Risk**: If placeholder values contain user input (stored in DB), attacker can inject malicious HTML/JS.

**Attack Vector**:
1. User creates template with: `{user}` in description
2. Malicious user sets username to: `</span><img src=x onerror=alert(1)>`
3. When template renders, final HTML becomes: `<span class="text-blue-400">@</span><img src=x onerror=alert(1)></span>`

**Recommendation**:
- Use React's `{}` syntax instead of `dangerouslySetInnerHTML`
- Create sanitized React components for formatting (bold, italic, mentions)
- Escape ALL user input before rendering, even placeholders
- If must use innerHTML, apply DOMPurify AFTER string replacement, not before

---

## High Priority Issues

### 2. Missing CSRF Protection (HIGH)
**Files**: All API routes (no CSRF token validation)

**Issue**: No CSRF protection for state-changing operations (POST, PATCH, DELETE). Relies solely on cookie-based auth without SameSite=Strict or CSRF tokens.

**Evidence**:
```typescript
// middleware.ts:39-43 - Only checks session cookie existence
const sessionCookie = request.cookies.get('__Secure-better-auth.session_data')

// No verification of:
// - CSRF tokens
// - Origin/Referer headers
// - Double-submit cookies
```

**Risk**: Attacker can trick authenticated users into making unwanted requests via malicious site.

**Attack Scenario**:
```html
<!-- Attacker's site -->
<form action="https://dashboard.sylabot.site/api/guilds/123/settings/import" method="POST">
  <input name="settings" value='{"antiSpam":{"enabled":false}}'>
</form>
<script>document.forms[0].submit()</script>
```

**Recommendation**:
- Add CSRF token middleware using `next-safe-action` or custom implementation
- Validate `Origin`/`Referer` headers match expected domains
- Use SameSite=Strict cookie attribute
- For API routes, require custom headers (e.g., `X-Requested-With: XMLHttpRequest`)

---

### 3. Missing Security Headers (HIGH)
**File**: `next.config.ts` (no security headers configured)

**Issue**: No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or other security headers.

**Evidence**: No CSP configuration found in `next.config.ts` or middleware.

**Risk**:
- **Clickjacking**: Dashboard can be embedded in iframes on attacker sites
- **XSS**: No CSP to block inline scripts or unsafe eval
- **MIME sniffing**: Browser may execute text files as JS

**Recommendation**:
```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://cdn.discordapp.com data:; connect-src 'self'; frame-ancestors 'none';"
        }
      ]
    }
  ];
}
```

---

## Medium Priority Issues

### 4. Weak Rate Limiting (MEDIUM)
**File**: `src/lib/rate-limit.ts`

**Issue**: In-memory rate limiting won't work across multiple server instances. 60 req/min per IP is permissive for sensitive operations.

**Evidence**:
```typescript
// Line 7: Single-server only
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS = 60; // Very high for sensitive ops
```

**Recommendation**:
- Use Redis-based rate limiting (already have Redis connection)
- Implement stricter limits for sensitive endpoints (admin, payment, settings import)
- Add exponential backoff for failed auth attempts

---

### 5. Webhook Signature Bypass in Dev Mode (MEDIUM)
**File**: `src/app/api/payments/sepay/webhook/route.ts:104-106`

**Issue**: Webhook signature validation disabled in development.

**Evidence**:
```typescript
if (!signature || !process.env.SEPAY_WEBHOOK_SECRET) {
  return process.env.NODE_ENV === 'development'; // BYPASS!
}
```

**Risk**: Developers may accidentally deploy with NODE_ENV=development, allowing unsigned webhooks.

**Recommendation**:
- Remove dev bypass
- Use separate webhook URLs/secrets for dev/prod
- Log all signature failures with request details

---

### 6. Hardcoded Admin IDs (MEDIUM)
**File**: `src/app/api/admin/codes/route.ts:8`

**Issue**: Admin Discord IDs stored in code instead of environment variables.

**Evidence**:
```typescript
const ADMIN_DISCORD_IDS = ['784728722459983874'];
```

**Risk**: Requires code changes to modify admin list; exposed in source control.

**Recommendation**:
- Move to `.env`: `ADMIN_DISCORD_IDS=784728722459983874,123456789`
- Implement RBAC in database for scalable permission management

---

### 7. Insufficient Input Validation on Import (MEDIUM)
**File**: `src/app/api/guilds/[guildId]/settings/import/route.ts:88-93`

**Issue**: Field-to-category mapping uses loose pattern matching that could allow unintended fields.

**Evidence**:
```typescript
// Line 89: Substring matching allows false positives
if (key.toLowerCase().includes(category.toLowerCase()) || isFieldInCategory(key, category))
```

**Recommendation**:
- Use strict whitelist of allowed field names per category
- Reject unknown fields instead of silently skipping
- Add max payload size limit (prevent DoS)

---

## Low Priority Issues

### 8. Session Cookie Security (LOW)
**File**: `src/lib/auth.ts:41-48`

**Issue**: Session configuration could be more restrictive.

**Current**:
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days - Long for sensitive app
  updateAge: 60 * 60 * 24, // 1 day
}
```

**Recommendation**:
- Reduce session lifetime to 24 hours for admin operations
- Add explicit SameSite=Strict cookie attribute
- Implement session rotation after privilege escalation

---

### 9. OAuth Token Storage (LOW)
**File**: `src/lib/discord-oauth.ts:138-146`

**Issue**: Refresh tokens stored in plaintext in database.

**Risk**: If database compromised, attacker gets long-lived Discord API access.

**Recommendation**:
- Encrypt refresh tokens at rest using `@repo/security` encryption utilities
- Implement token rotation policy
- Clear tokens on logout

---

### 10. Missing Rate Limiting on Critical Routes (LOW)

**Missing rate limits**:
- `/api/guilds/[guildId]/settings/import` - No protection against rapid import spam
- `/api/admin/codes` - No limit on upgrade code creation
- `/api/webhooks/stripe` - Relies only on Stripe signature

**Recommendation**: Apply aggressive rate limits (5-10 req/min) to sensitive endpoints.

---

## Positive Observations

✅ **Strong Authentication**: Discord OAuth via better-auth properly implemented
✅ **Guild Authorization**: MANAGE_GUILD permission check prevents unauthorized access
✅ **Token Refresh**: Mutex-based refresh prevents race conditions
✅ **Webhook Idempotency**: Stripe webhook has proper duplicate event handling
✅ **Audit Logging**: Comprehensive audit trail for settings changes
✅ **Input Sanitization**: Zod validation used for settings updates
✅ **Timing-Safe Comparisons**: Uses `crypto.timingSafeEqual` for signature verification

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix XSS in message preview - remove `dangerouslySetInnerHTML`, use React components
2. **[HIGH]** Implement CSRF protection for state-changing operations
3. **[HIGH]** Add security headers (CSP, X-Frame-Options, X-Content-Type-Options)
4. **[MEDIUM]** Replace in-memory rate limiting with Redis-based solution
5. **[MEDIUM]** Remove webhook signature bypass in development mode
6. **[MEDIUM]** Move admin IDs to environment variables
7. **[LOW]** Reduce session lifetime and add explicit SameSite=Strict
8. **[LOW]** Encrypt OAuth refresh tokens at rest

---

## Metrics

- **Files Reviewed**: 12 source files, 5 API routes
- **Security Issues Found**: 10 (1 Critical, 2 High, 4 Medium, 3 Low)
- **Authentication**: Discord OAuth (better-auth) ✅
- **Authorization**: Discord MANAGE_GUILD permission ✅
- **CSRF Protection**: ❌ Missing
- **XSS Prevention**: ⚠️ Partial (1 vulnerability found)
- **Rate Limiting**: ⚠️ In-memory only (not production-ready)
- **Security Headers**: ❌ Missing
- **Session Management**: ✅ Implemented (needs hardening)

---

## Unresolved Questions

- Is DOMPurify version latest? (Check for known bypasses)
- Are placeholder values (`{user}`, etc.) sourced from Discord API or user-controlled DB fields?
- What's the expected traffic volume for rate limiting calibration?
- Is multi-region deployment planned? (Affects rate limiting strategy)
