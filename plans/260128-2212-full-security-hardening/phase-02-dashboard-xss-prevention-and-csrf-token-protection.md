# Phase 02: Dashboard XSS Prevention and CSRF Token Protection

## Context Links
- Security Audit: `../reports/code-reviewer-260128-2200-dashboard-security.md`
- XSS Location: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/dashboard/messages/page.tsx`
- Auth Config: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/lib/auth.ts`

## Overview
- **Priority:** CRITICAL
- **Status:** completed
- **Effort:** 2h
- **Risk:** XSS allows session hijacking, CSRF allows unauthorized actions

## Key Insights
- `dangerouslySetInnerHTML` used in message preview component (lines 1194-1250)
- DOMPurify imported but sanitization may be bypassable with current config
- Better-Auth handles CSRF for auth routes but custom API routes unprotected
- 6 instances of `dangerouslySetInnerHTML` in messages page

## Requirements

### Functional
- All user input sanitized before DOM insertion
- CSRF tokens required on all mutating API routes (POST/PUT/DELETE)
- Sanitization preserves safe formatting (bold, italic, links)

### Non-Functional
- Sanitization < 1ms for typical inputs
- No UI degradation in message preview
- CSRF validation adds < 5ms latency

## Architecture

```
User Input ──> DOMPurify.sanitize() ──> Safe HTML ──> dangerouslySetInnerHTML
                     │
                     └── Config: ALLOWED_TAGS, ALLOWED_ATTR
```

**CSRF Flow:**
```
Page Load ──> Get CSRF Token (cookie) ──> Include in X-CSRF-Token header ──> Validate on server
```

## Related Code Files

### Modify
- `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/messages/page.tsx` - Fix XSS
- `apps/dashboard/src/lib/api-client.ts` - Add CSRF header to requests

### Create
- `apps/dashboard/src/lib/sanitize-html-for-preview.ts` - Centralized sanitization
- `apps/dashboard/src/middleware.ts` - CSRF validation middleware

## Implementation Steps

### Step 1: Create Centralized Sanitization Utility
```typescript
// apps/dashboard/src/lib/sanitize-html-for-preview.ts
import DOMPurify from 'dompurify';

// Safe tags for Discord-like formatting
const ALLOWED_TAGS = ['strong', 'em', 'u', 's', 'br', 'span', 'code', 'pre'];
const ALLOWED_ATTR = ['class'];

/**
 * Sanitize user input for safe HTML preview
 * Strips all potentially dangerous content while preserving formatting
 */
export function sanitizeForPreview(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First pass: Strip ALL HTML from user input
  const stripped = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Second pass: Apply safe formatting transformations
  const formatted = stripped
    // Discord markdown to HTML
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
    // Placeholders with safe styling
    .replace(/\{user\}/g, '<span class="text-blue-400">@User</span>')
    .replace(/\{username\}/g, 'Username')
    .replace(/\{server\}/g, 'Server Name')
    .replace(/\{membercount\}/g, '1,234')
    // ... other placeholders
    ;

  // Third pass: Ensure output only contains allowed tags
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

/**
 * Escape HTML entities without any formatting
 * Use for contexts where NO HTML is expected
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

### Step 2: Update Messages Page to Use Sanitization
```typescript
// apps/dashboard/src/app/[locale]/(dashboard)/dashboard/messages/page.tsx
// Replace the existing renderPreview function

import { sanitizeForPreview } from '@/lib/sanitize-html-for-preview';

// Remove the inline renderPreview function and use:
const renderPreview = useCallback((text: string) => {
  return sanitizeForPreview(text);
}, []);
```

### Step 3: Add CSRF Middleware for API Routes
```typescript
// apps/dashboard/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Routes that require CSRF protection (mutating operations)
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Routes to exclude from CSRF (webhooks, auth callbacks)
const CSRF_EXEMPT_ROUTES = [
  '/api/auth',
  '/api/payments/sepay/webhook',
  '/api/payments/stripe/webhook',
];

export function middleware(request: NextRequest) {
  const { pathname, method } = request.nextUrl;

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip exempt routes
  if (CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Only check CSRF for mutating methods
  if (!PROTECTED_METHODS.includes(request.method)) {
    return NextResponse.next();
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Step 4: Generate CSRF Token on Page Load
```typescript
// apps/dashboard/src/app/layout.tsx or providers
// Add CSRF token generation

import { cookies } from 'next/headers';
import crypto from 'crypto';

async function generateCsrfToken() {
  const cookieStore = await cookies();
  let token = cookieStore.get('__Host-csrf')?.value;

  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    cookieStore.set('__Host-csrf', token, {
      httpOnly: false, // Must be readable by JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  return token;
}
```

### Step 5: Update API Client to Include CSRF Token
```typescript
// apps/dashboard/src/lib/api-client.ts
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)__Host-csrf=([^;]*)/);
  return match ? match[1] : null;
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add CSRF token for mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}
```

## Todo List

- [x] Create `sanitize-html-for-preview.ts` utility
- [x] Update `messages/page.tsx` to use centralized sanitization
- [x] Audit all `dangerouslySetInnerHTML` usages in dashboard (1 file found, secured)
- [x] Create CSRF middleware in `middleware.ts`
- [x] Add CSRF token generation to layout/providers
- [x] Update API client to include CSRF header
- [x] Test XSS payloads are blocked in preview
- [x] Test CSRF rejection without token
- [x] Test normal operations work with CSRF token

## Success Criteria

- [x] `<script>alert(1)</script>` in message content shows as text, not executed
- [x] `<img src=x onerror=alert(1)>` stripped from output
- [x] POST requests without CSRF token return 403
- [x] POST requests with valid CSRF token succeed
- [x] Message preview still shows bold/italic formatting correctly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking message preview | Medium | Low | Thorough testing of formatting |
| CSRF breaks legitimate requests | Medium | Medium | Gradual rollout, error handling |
| New XSS vectors discovered | Low | High | Regular security audits |

## Security Considerations

- Use `__Host-` prefix for CSRF cookie (requires Secure, no Domain)
- SameSite=Strict prevents cross-origin cookie sending
- Double-submit cookie pattern (cookie + header must match)
- Exempt webhook endpoints that use signature verification
- DOMPurify updated regularly for new bypass prevention

## Next Steps

After this phase:
1. Audit other components for XSS risks
2. Add CSP headers (Phase 03) for defense in depth
3. Consider Content-Security-Policy nonce for inline scripts
