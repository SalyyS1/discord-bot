# Phase 03: Next.js Security Headers CSP X-Frame-Options Configuration

## Context Links
- Security Audit: `../reports/code-reviewer-260128-2200-security-audit.md` (L2)
- Next.js Config: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/next.config.ts`
- OWASP Headers: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html

## Overview
- **Priority:** HIGH
- **Status:** completed
- **Effort:** 1.5h
- **Risk:** Clickjacking, XSS, MIME sniffing attacks

## Key Insights
- Current `next.config.ts` has NO security headers configured
- Dashboard handles sensitive operations (bot control, token storage)
- Missing: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Next.js 15 supports `headers()` async function in config

## Requirements

### Functional
- Block embedding in iframes (prevent clickjacking)
- Restrict resource loading origins (CSP)
- Prevent MIME type sniffing
- Control referrer information leakage

### Non-Functional
- Headers must not break Discord CDN images
- CSP must allow inline styles (Tailwind)
- No performance impact from headers

## Architecture

```
Next.js Config
     │
     └── headers() ──> All Routes
                        ├── Content-Security-Policy
                        ├── X-Frame-Options: DENY
                        ├── X-Content-Type-Options: nosniff
                        ├── Referrer-Policy: strict-origin-when-cross-origin
                        ├── X-XSS-Protection: 0 (deprecated, CSP replaces)
                        └── Permissions-Policy
```

## Related Code Files

### Modify
- `apps/dashboard/next.config.ts` - Add security headers

### Create
- `apps/dashboard/src/config/security-headers-configuration.ts` - Header definitions

## Implementation Steps

### Step 1: Create Security Headers Configuration
```typescript
// apps/dashboard/src/config/security-headers-configuration.ts

export interface SecurityHeader {
  key: string;
  value: string;
}

const isDev = process.env.NODE_ENV === 'development';

// Content Security Policy directives
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // Allow Next.js inline scripts in dev
    isDev ? "'unsafe-eval'" : '',
    // Nonce would be better but requires middleware
    "'unsafe-inline'", // Required for Next.js
  ].filter(Boolean),
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind/CSS-in-JS
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://cdn.discordapp.com',
    'https://*.discordapp.com',
    'https://i.imgur.com',
  ],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://discord.com',
    'https://*.discord.com',
    process.env.MANAGER_API_URL || 'http://localhost:3001',
    // Add analytics/monitoring endpoints if used
  ],
  'frame-ancestors': ["'none'"], // Prevent embedding
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': isDev ? [] : [''],
};

function buildCsp(): string {
  return Object.entries(cspDirectives)
    .filter(([, values]) => values.length > 0)
    .map(([directive, values]) => {
      const valueStr = values.filter(Boolean).join(' ');
      return valueStr ? `${directive} ${valueStr}` : directive;
    })
    .join('; ');
}

export const securityHeaders: SecurityHeader[] = [
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: buildCsp(),
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Disable deprecated XSS filter (CSP is better)
  {
    key: 'X-XSS-Protection',
    value: '0',
  },
  // Restrict browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // HSTS (only in production with HTTPS)
  ...(isDev ? [] : [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  }]),
];

// Headers for API routes (different CSP)
export const apiSecurityHeaders: SecurityHeader[] = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Cache-Control',
    value: 'no-store, max-age=0',
  },
];
```

### Step 2: Update Next.js Config
```typescript
// apps/dashboard/next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaders, apiSecurityHeaders } from './src/config/security-headers-configuration';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  transpilePackages: ['@repo/database', '@repo/config', '@repo/security', '@repo/types'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
    ],
  },

  outputFileTracingIncludes: {
    '/*': ['./node_modules/.prisma/**/*'],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@prisma/client'];
    }
    return config;
  },

  // Security headers
  async headers() {
    return [
      // Apply security headers to all pages
      {
        source: '/((?!api/).*)',
        headers: securityHeaders,
      },
      // Apply different headers to API routes
      {
        source: '/api/:path*',
        headers: apiSecurityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
```

### Step 3: Test CSP Violations
```typescript
// apps/dashboard/src/app/api/csp-report/route.ts
// Optional: CSP violation reporting endpoint

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();

    logger.warn('[CSP Violation]', {
      documentUri: report['csp-report']?.['document-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      blockedUri: report['csp-report']?.['blocked-uri'],
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}
```

### Step 4: Add Report-URI to CSP (Optional)
```typescript
// In security-headers-configuration.ts, add to cspDirectives:
'report-uri': ['/api/csp-report'],
// Or use report-to for newer browsers
```

## Todo List

- [x] Create `security-headers-configuration.ts`
- [x] Update `next.config.ts` with headers() function
- [ ] Test dashboard loads without CSP errors
- [ ] Verify Discord CDN images still load
- [ ] Test iframe embedding is blocked
- [ ] Verify API responses have correct headers
- [ ] Check dev mode works with relaxed CSP
- [ ] Optional: Add CSP violation reporting

## Success Criteria

- [ ] `curl -I https://dashboard.example.com` shows all security headers
- [ ] X-Frame-Options: DENY present
- [ ] Content-Security-Policy header present
- [ ] No CSP violations in browser console during normal use
- [ ] Dashboard iframe embed fails (test with `<iframe src="...">`)
- [ ] Discord avatar images load correctly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CSP breaks functionality | Medium | Medium | Test all features, use report-only first |
| Third-party scripts blocked | Medium | Low | Audit and whitelist required origins |
| Dev mode issues | Low | Low | Relaxed CSP in development |

## Security Considerations

- `frame-ancestors: 'none'` stronger than X-Frame-Options
- `unsafe-inline` for styles needed for Tailwind/CSS-in-JS
- Consider nonce-based CSP for scripts (requires middleware)
- HSTS preload only after confirming HTTPS works everywhere
- `upgrade-insecure-requests` forces HTTPS for all resources

## Next Steps

After this phase:
1. Monitor CSP reports for violations
2. Tighten CSP by removing `unsafe-inline` with nonces
3. Add Subresource Integrity (SRI) for external scripts
4. Consider adding `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`
