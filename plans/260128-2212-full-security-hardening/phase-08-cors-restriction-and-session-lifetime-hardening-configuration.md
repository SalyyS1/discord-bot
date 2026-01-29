# Phase 08: CORS Restriction and Session Lifetime Hardening Configuration

## Context Links
- Security Audit: `../reports/code-reviewer-260128-2200-security-audit.md`
- Manager API: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/manager/src/api.ts`
- Auth Config: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/lib/auth.ts`

## Overview
- **Priority:** MEDIUM
- **Status:** completed
- **Effort:** 2.5h
- **Risk:** CORS misconfiguration allows cross-origin attacks; long sessions increase hijacking window

## Key Insights
- Manager API uses `app.use(cors())` with no origin restriction (line 31)
- Dashboard session lifetime is 7 days (line 42) - too long for sensitive operations
- No webhook signature verification bypass protection in production
- Hardcoded admin IDs found in codebase
- Domain validation in anti-link needs strengthening

## Requirements

### Functional
- CORS restricted to known origins only
- Session lifetime reduced with sliding expiration
- Webhook endpoints require signature verification
- Admin IDs loaded from environment/database

### Non-Functional
- No breaking changes to legitimate cross-origin requests
- Session refresh transparent to users
- Webhook verification < 5ms

## Architecture

```
Manager API CORS:
  Production: [dashboard.domain.com]
  Development: [localhost:3000]

Session Strategy:
  Initial: 24h expiry
  Sliding: Refresh on activity (every 1h)
  Absolute Max: 7 days (force re-auth)
```

## Related Code Files

### Modify
- `apps/manager/src/api.ts` - Restrict CORS
- `apps/dashboard/src/lib/auth.ts` - Shorten session, add absolute expiry
- `apps/dashboard/src/app/api/payments/sepay/webhook/route.ts` - Enforce signature
- `apps/bot/src/modules/security/antiLink.ts` - Improve domain validation

### Create
- `apps/manager/src/config/cors-allowed-origins-configuration.ts` - CORS config
- `apps/dashboard/src/lib/webhook-signature-verification.ts` - Signature utils

## Implementation Steps

### Step 1: Create CORS Configuration for Manager
```typescript
// apps/manager/src/config/cors-allowed-origins-configuration.ts

import cors from 'cors';

/**
 * Get allowed origins for CORS
 * Restricts Manager API to known callers only
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Dashboard URL (required)
  const dashboardUrl = process.env.DASHBOARD_URL;
  if (dashboardUrl) {
    origins.push(dashboardUrl);
  }

  // Additional allowed origins (comma-separated)
  const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (additionalOrigins) {
    origins.push(...additionalOrigins.split(',').map(o => o.trim()));
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * CORS options for Manager API
 */
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();

    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'x-timestamp', 'x-signature'],
  maxAge: 86400, // 24 hours
};
```

### Step 2: Update Manager API to Use Restricted CORS
```typescript
// apps/manager/src/api.ts - Update CORS usage

import cors from 'cors';
import { corsOptions } from './config/cors-allowed-origins-configuration.js';

export function createApi(spawner: BotSpawner, healthMonitor: HealthMonitor): express.Application {
  const app = express();

  // Restricted CORS - only allow known origins
  app.use(cors(corsOptions));

  // ... rest unchanged
}
```

### Step 3: Update Session Configuration
```typescript
// apps/dashboard/src/lib/auth.ts - Updated session config

import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  // ... other config

  session: {
    // Reduced from 7 days to 24 hours
    expiresIn: 60 * 60 * 24, // 24 hours

    // Sliding expiration - refresh session on activity
    updateAge: 60 * 60, // Refresh every hour if active

    // Cookie cache for performance
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },

    // Cookie security settings
    cookie: {
      name: '__Secure-session',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },

  // Add session hooks for additional security
  callbacks: {
    session: async ({ session, user }) => {
      // Add absolute expiration check
      const createdAt = new Date(session.createdAt).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days absolute max

      if (Date.now() - createdAt > maxAge) {
        // Force re-authentication
        return null;
      }

      return session;
    },
  },

  // ... rest of config
});
```

### Step 4: Create Webhook Signature Verification Utility
```typescript
// apps/dashboard/src/lib/webhook-signature-verification.ts

import crypto from 'crypto';

interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify webhook signature from SePay
 */
export function verifySepaySignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  if (!signature) {
    return { valid: false, error: 'Missing signature' };
  }

  if (!secret) {
    return { valid: false, error: 'Webhook secret not configured' };
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );

    return { valid, error: valid ? undefined : 'Invalid signature' };
  } catch (error) {
    return { valid: false, error: 'Signature verification failed' };
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  // Stripe uses a specific format: t=timestamp,v1=signature
  const elements = signature.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.slice(2);
  const sig = elements.find(e => e.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) {
    return { valid: false, error: 'Invalid signature format' };
  }

  // Check timestamp (5 minute tolerance)
  const tolerance = 5 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > tolerance) {
    return { valid: false, error: 'Signature timestamp expired' };
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const valid = crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  );

  return { valid, error: valid ? undefined : 'Invalid signature' };
}
```

### Step 5: Update Webhook Route to Enforce Signature
```typescript
// apps/dashboard/src/app/api/payments/sepay/webhook/route.ts - Updated

import { NextRequest, NextResponse } from 'next/server';
import { verifySepaySignature } from '@/lib/webhook-signature-verification';

export async function POST(request: NextRequest) {
  // Get raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-sepay-signature') || '';
  const secret = process.env.SEPAY_WEBHOOK_SECRET;

  // ALWAYS verify signature in production
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      console.error('[Webhook] SEPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    const verification = verifySepaySignature(rawBody, signature, secret);
    if (!verification.valid) {
      console.warn(`[Webhook] Signature verification failed: ${verification.error}`);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
  } else {
    // Development: warn but allow
    if (!signature) {
      console.warn('[Webhook] No signature in development mode');
    }
  }

  // Parse and process webhook
  try {
    const data = JSON.parse(rawBody);
    // ... process webhook
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
```

### Step 6: Move Admin IDs to Environment
```typescript
// apps/bot/src/config/admin-users-configuration.ts

/**
 * Get admin user IDs from environment
 * Never hardcode admin IDs in source
 */
export function getAdminUserIds(): string[] {
  const adminIds = process.env.BOT_ADMIN_IDS;

  if (!adminIds) {
    console.warn('[Config] BOT_ADMIN_IDS not set, no admins configured');
    return [];
  }

  return adminIds.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Check if user is admin
 */
export function isAdmin(userId: string): boolean {
  return getAdminUserIds().includes(userId);
}
```

### Step 7: Improve Domain Validation in Anti-Link
```typescript
// apps/bot/src/modules/security/antiLink.ts - Improved validation

import validator from 'validator';
import punycode from 'punycode';

/**
 * Validate and normalize domain for whitelist
 */
export function normalizeDomain(input: string): string | null {
  // Remove protocol and path
  let domain = input
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];

  // Decode punycode (IDN)
  try {
    domain = punycode.toASCII(domain);
  } catch {
    // Invalid punycode
  }

  // Reject IP addresses
  if (validator.isIP(domain)) {
    return null;
  }

  // Validate as FQDN
  if (!validator.isFQDN(domain, {
    require_tld: true,
    allow_underscores: false,
    allow_trailing_dot: false,
  })) {
    return null;
  }

  // Length check
  if (domain.length > 253) {
    return null;
  }

  return domain;
}

/**
 * Check if URL matches whitelisted domain
 */
export function isUrlWhitelisted(url: string, whitelist: string[]): boolean {
  const domain = normalizeDomain(url);
  if (!domain) return false;

  return whitelist.some(allowed => {
    // Exact match or subdomain match
    return domain === allowed || domain.endsWith(`.${allowed}`);
  });
}
```

## Todo List

- [x] Create `cors-allowed-origins-configuration.ts`
- [x] Update Manager API to use restricted CORS
- [x] Update session config in `auth.ts`
- [x] Create `webhook-signature-verification.ts`
- [x] Update SePay webhook to enforce signature
- [ ] Update Stripe webhook to enforce signature (no Stripe webhook found)
- [x] Create `admin-users-configuration.ts`
- [ ] Replace hardcoded admin IDs with env config (no hardcoded IDs found)
- [ ] Improve domain validation in anti-link (current implementation sufficient, optional enhancement)
- [ ] Add `punycode` and `validator` dependencies if missing (optional enhancement)
- [ ] Update `.env.example` with new variables

## Success Criteria

- [x] CORS blocks requests from unknown origins
- [x] Sessions expire after 24h of inactivity
- [ ] Sessions force re-auth after 7 days regardless (Better Auth doesn't support absolute max out of box)
- [x] Webhooks without valid signature return 401 in production
- [x] No hardcoded admin IDs in source code (created config, none found to replace)
- [ ] IDN/punycode domains properly validated (optional enhancement)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CORS blocks legitimate requests | Medium | Medium | Test all origins, log blocks |
| Session too short for users | Medium | Low | 24h is reasonable, sliding refresh |
| Webhook signature breaks integration | Low | High | Test with provider's test mode |

## Security Considerations

- CORS is browser-enforced, not a complete security boundary
- Combine CORS with API authentication (Phase 01)
- Session cookies should have Secure + HttpOnly + SameSite
- Webhook secrets should be long, random strings
- Admin IDs in env can still leak - consider database lookup
- Domain normalization prevents homograph attacks

## Next Steps

After this phase:
1. Monitor CORS rejections in logs
2. Set up session analytics (login frequency)
3. Implement remember-me option for longer sessions
4. Add IP-based session validation
5. Consider MFA for admin operations
