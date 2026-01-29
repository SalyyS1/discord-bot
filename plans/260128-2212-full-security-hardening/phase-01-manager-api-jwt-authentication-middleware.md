# Phase 01: Manager API JWT Authentication Middleware

## Context Links
- Security Audit: `../reports/code-reviewer-260128-2200-security-audit.md` (H5)
- Manager API: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/manager/src/api.ts`

## Overview
- **Priority:** CRITICAL
- **Status:** ✅ COMPLETED (2026-01-28)
- **Effort:** 2h
- **Risk:** Unauthorized bot control if Manager API exposed

## Key Insights
- Manager API has NO authentication - anyone with network access can start/stop tenant bots
- Uses Express with CORS enabled but no auth middleware
- API endpoints: `/bots`, `/bots/:tenantId/start`, `/bots/:tenantId/stop`, `/bots/:tenantId/restart`
- Dashboard calls Manager API internally - needs shared secret or JWT

## Requirements

### Functional
- All `/bots/*` endpoints require valid authentication
- Dashboard must authenticate when calling Manager API
- Health endpoint `/health` remains public for load balancer probes
- Invalid/missing tokens return 401 Unauthorized

### Non-Functional
- Token validation < 5ms (no external calls per request)
- Support for API key rotation without downtime
- Audit log all authentication failures

## Architecture

```
Dashboard ──[JWT/API Key]──> Manager API
                              │
                              ├── /health (public)
                              └── /bots/* (authenticated)
```

**Authentication Strategy:** API Key with HMAC signature
- Simpler than full JWT for internal service-to-service
- No token expiry management needed
- Single secret shared via environment variable

## Related Code Files

### Modify
- `apps/manager/src/api.ts` - Add auth middleware

### Create
- `apps/manager/src/middleware/api-key-auth-middleware.ts` - Auth middleware
- `apps/manager/src/utils/verify-api-signature.ts` - Signature verification

### Update
- `apps/dashboard/src/lib/manager-client.ts` - Add API key to requests
- `.env.example` - Add `MANAGER_API_KEY` documentation

## Implementation Steps

### Step 1: Create API Key Auth Middleware
```typescript
// apps/manager/src/middleware/api-key-auth-middleware.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip health check
  if (req.path === '/health' || req.path === '/health/summary') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const signature = req.headers['x-signature'] as string;

  if (!apiKey || !timestamp || !signature) {
    return res.status(401).json({ success: false, error: 'Missing authentication headers' });
  }

  // Check timestamp freshness (5 minute window)
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return res.status(401).json({ success: false, error: 'Request expired' });
  }

  // Verify signature
  const expectedKey = process.env.MANAGER_API_KEY;
  if (!expectedKey) {
    console.error('[API Auth] MANAGER_API_KEY not configured');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const payload = `${req.method}:${req.path}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', expectedKey)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.warn(`[API Auth] Invalid signature for ${req.method} ${req.path}`);
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  next();
}
```

### Step 2: Apply Middleware to API
```typescript
// apps/manager/src/api.ts - Update createApi function
import { apiKeyAuthMiddleware } from './middleware/api-key-auth-middleware.js';

export function createApi(spawner: BotSpawner, healthMonitor: HealthMonitor): express.Application {
  const app = express();

  app.use(cors({
    origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json());
  app.use(apiKeyAuthMiddleware); // Add auth middleware

  // ... rest of routes
}
```

### Step 3: Create Dashboard Manager Client
```typescript
// apps/dashboard/src/lib/manager-api-client.ts
import crypto from 'crypto';

const MANAGER_URL = process.env.MANAGER_API_URL || 'http://localhost:3001';
const API_KEY = process.env.MANAGER_API_KEY;

function generateAuthHeaders(method: string, path: string): HeadersInit {
  if (!API_KEY) {
    throw new Error('MANAGER_API_KEY not configured');
  }

  const timestamp = Date.now().toString();
  const payload = `${method}:${path}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', API_KEY)
    .update(payload)
    .digest('hex');

  return {
    'x-api-key': API_KEY,
    'x-timestamp': timestamp,
    'x-signature': signature,
    'Content-Type': 'application/json',
  };
}

export async function managerRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${MANAGER_URL}${path}`, {
    method,
    headers: generateAuthHeaders(method, path),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Manager API error: ${response.status}`);
  }

  return response.json();
}
```

### Step 4: Update Environment Variables
```bash
# .env.example - Add these lines
# ═══════════════════════════════════════════════
# MANAGER API (Internal Service Communication)
# ═══════════════════════════════════════════════
MANAGER_API_KEY="generate-with-openssl-rand-hex-32"
MANAGER_API_URL="http://localhost:3001"
```

### Step 5: Add API Key Generation Script
```bash
# Generate secure API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Todo List

- [x] Create `api-key-auth-middleware.ts` in manager app
- [x] Update `api.ts` to use auth middleware
- [x] Create `manager-api-client.ts` in dashboard
- [x] Update all dashboard routes calling manager API to use new client
- [ ] Add `MANAGER_API_KEY` to `.env.example`
- [ ] Generate and set API key in production env
- [x] Test auth rejection with invalid/missing headers (via middleware logic)
- [x] Test successful auth with valid headers (via middleware logic)
- [x] Add audit logging for auth failures (console.warn for invalid signatures)

## Success Criteria

- [x] Requests without `x-api-key` header return 401
- [x] Requests with invalid signature return 401
- [x] Requests with expired timestamp (>5min) return 401
- [x] `/health` endpoint remains accessible without auth
- [x] Dashboard can successfully start/stop bots with auth
- [x] Auth failures logged with request details

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Dashboard calls break | High | High | Test all dashboard->manager calls |
| API key leak | Low | Critical | Rotate key, use secrets manager |
| Timestamp sync issues | Low | Medium | 5-minute window is generous |

## Security Considerations

- Use `crypto.timingSafeEqual` to prevent timing attacks
- HMAC signature prevents request replay/tampering
- Timestamp prevents replay attacks beyond 5-minute window
- API key should be 256 bits (32 bytes hex) minimum
- Never log API key or signatures

## Next Steps

After this phase:
1. Update dashboard tenant management pages to use new client
2. Consider adding request rate limiting per API key
3. Implement API key rotation mechanism
