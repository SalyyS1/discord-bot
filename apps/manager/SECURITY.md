# Manager API Security

## HMAC Authentication

The Manager API uses HMAC-SHA256 signature-based authentication to prevent unauthorized access.

### Required Headers

Every request (except `/health` and `/health/summary`) must include:

```
x-api-key: <MANAGER_API_KEY>
x-timestamp: <Unix timestamp in milliseconds>
x-signature: <HMAC-SHA256 signature>
```

### Signature Generation

```typescript
const timestamp = Date.now().toString();
const payload = `${method}:${path}:${timestamp}`;
const signature = crypto
  .createHmac('sha256', MANAGER_API_KEY)
  .update(payload)
  .digest('hex');
```

### Security Features

1. **Replay Attack Prevention**: 5-minute timestamp window
2. **Timing Attack Protection**: Constant-time signature comparison
3. **Request Binding**: Signature includes method + path + timestamp
4. **Health Endpoint Exemption**: `/health` accessible for load balancers

### Environment Variables

```bash
MANAGER_API_KEY=<strong-secret-key>  # Required - shared with dashboard
MANAGER_API_URL=http://localhost:3001  # Dashboard uses this to connect
```

### Error Responses

- `401 Missing authentication headers` - Missing required headers
- `401 Request expired` - Timestamp outside 5-minute window
- `401 Invalid signature` - Signature verification failed
- `500 Server configuration error` - MANAGER_API_KEY not set

### Client Usage

Dashboard uses the `managerApi` client:

```typescript
import { managerApi } from '@/lib/manager-api-client';

await managerApi.startBot(tenantId);
await managerApi.stopBot(tenantId);
await managerApi.restartBot(tenantId);
```

## Implementation Files

- **Middleware**: `apps/manager/src/middleware/api-key-auth-middleware.ts`
- **Client**: `apps/dashboard/src/lib/manager-api-client.ts`
- **Integration**: `apps/manager/src/api.ts` (line 34)
- **Routes**: `apps/dashboard/src/app/api/tenants/[id]/{start,stop}/route.ts`
