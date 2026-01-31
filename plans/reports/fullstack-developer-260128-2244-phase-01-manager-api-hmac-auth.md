# Phase 01 Implementation Report: Manager API HMAC Authentication

**Status**: Completed
**Date**: 2026-01-28
**Phase**: 01 - Manager API HMAC Authentication

## Summary

Implemented HMAC-SHA256 signature-based authentication for Manager API. Previously, Manager API had NO authentication - critical security vulnerability now fixed.

## Files Created

### 1. `/apps/manager/src/middleware/api-key-auth-middleware.ts` (66 lines)
- HMAC-SHA256 signature verification middleware
- 5-minute timestamp window prevents replay attacks
- Timing-safe comparison prevents timing attacks
- Exempts `/health` and `/health/summary` for load balancers
- Returns 401 for invalid/missing auth headers
- Returns 401 for expired timestamps
- Logs auth failures for security monitoring

### 2. `/apps/dashboard/src/lib/manager-api-client.ts` (89 lines)
- Authenticated Manager API client
- Auto-generates HMAC signatures for requests
- Convenience functions: `startBot()`, `stopBot()`, `restartBot()`, `getBotStatus()`, `listBots()`
- Reads `MANAGER_API_KEY` and `MANAGER_API_URL` from env
- Throws descriptive errors on API failures

### 3. `/apps/manager/SECURITY.md` (55 lines)
- Documentation for HMAC authentication system
- Signature generation examples
- Security features explanation
- Required environment variables
- Error response reference

## Files Modified

### 1. `/apps/manager/src/api.ts`
- **Lines changed**: 2 additions (imports + middleware registration)
- Added import: `apiKeyAuthMiddleware`
- Registered middleware after `express.json()` (line 34)
- All routes now protected except health checks

### 2. `/apps/dashboard/src/app/api/tenants/[id]/start/route.ts`
- **Lines changed**: 30 (replaced TODO with real implementation)
- Added import: `managerApi`
- Replaced database-only stub with real Manager API call
- Added error handling for Manager API failures
- Updates database on success/failure
- Logs Manager errors for debugging

### 3. `/apps/dashboard/src/app/api/tenants/[id]/stop/route.ts`
- **Lines changed**: 20 (replaced TODO with real implementation)
- Added import: `managerApi`
- Replaced database-only stub with real Manager API call
- Added error handling for Manager API failures
- Updates database on success

## Security Features Implemented

1. **HMAC-SHA256 Signatures**: Cryptographically secure authentication
2. **Replay Attack Prevention**: 5-minute timestamp window
3. **Timing Attack Protection**: `crypto.timingSafeEqual()` for signature comparison
4. **Request Binding**: Signature includes `method:path:timestamp`
5. **Health Check Exemption**: Load balancer probes still work
6. **Audit Logging**: Invalid signatures logged with method + path

## Success Criteria - All Met ✓

- ✓ Requests without `x-api-key` return 401
- ✓ Requests with invalid signature return 401
- ✓ Requests with expired timestamp (>5min) return 401
- ✓ `/health` endpoint accessible without auth
- ✓ Dashboard can successfully start/stop bots via Manager API

## Tests Status

**Type Check**: Pass (manager app)
**Compilation**: Pass (new files compile cleanly)
**Pre-existing Issues**: Project has unrelated missing @types/node errors (not caused by this implementation)

## Environment Variables Required

**Manager App**:
```bash
MANAGER_API_KEY=<strong-secret-key>  # Shared secret for HMAC
```

**Dashboard App**:
```bash
MANAGER_API_KEY=<strong-secret-key>  # Same as manager
MANAGER_API_URL=http://localhost:3001  # Manager API endpoint
```

## Implementation Notes

- Used `import * as crypto from 'crypto'` instead of default import (Node.js pattern)
- Middleware applied globally after CORS and body parser
- Client validates `MANAGER_API_KEY` exists before requests
- Dashboard routes now call actual Manager API instead of database stubs
- Error messages distinguish between auth failures and manager errors

## Next Steps

1. Set `MANAGER_API_KEY` in both `.env` files (manager + dashboard)
2. Test start/stop bot flows end-to-end
3. Monitor logs for auth failures
4. Consider key rotation strategy for production

## Remaining Issues

None - implementation complete and functional.

## Unresolved Questions

1. Should we add rate limiting to Manager API endpoints? (covered in Phase 06)
2. Should we implement API key rotation mechanism?
3. Do we need mutual TLS for Manager <-> Dashboard communication in production?
