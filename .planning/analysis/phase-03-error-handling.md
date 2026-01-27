# Phase 03: Error Handling Consistency

**Date:** 2026-01-27 | **Priority:** Medium | **Status:** Pending

---

## Context

Inconsistent error response formats across API routes. Mix of `NextResponse.json()` direct calls and `ApiResponse` helper class.

---

## Overview

| Metric           | Value     |
| ---------------- | --------- |
| Files Affected   | 8+        |
| Inconsistencies  | 15+       |
| Estimated Effort | 1-2 hours |
| Risk Level       | Low       |

---

## Key Insights

- `ApiResponse` helper exists but not used consistently
- Direct `NextResponse.json()` calls mixed with helper
- Some silent catch blocks may hide real issues

---

## Requirements

1. Standardize all API error responses to use `ApiResponse`
2. Review and document intentional silent catches
3. Add error logging to non-intentional catches

---

## Current Inconsistency Examples

### File: `apps/dashboard/src/app/api/guilds/[guildId]/welcome/route.ts`

```typescript
// Line 104: Direct NextResponse usage
return NextResponse.json({ error: error.errors }, { status: 400 });
```

### File: `apps/dashboard/src/app/api/guilds/[guildId]/settings/route.ts`

```typescript
// Line 104: Uses ApiResponse helper (correct)
return ApiResponse.badRequest(error.errors[0]?.message || 'Validation failed');
```

---

## ApiResponse Helper (Existing)

```typescript
// apps/dashboard/src/lib/api-response.ts
export class ApiResponse {
  static ok<T>(data: T) {
    return NextResponse.json(data);
  }
  static badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  static unauthorized(message = 'Unauthorized') {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  static forbidden(message = 'Forbidden') {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  static notFound(message = 'Not found') {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  static serverError(message = 'Internal server error') {
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## Implementation Steps

### Step 1: Audit All API Routes

Find all direct `NextResponse.json` calls with status codes:

```bash
rg "NextResponse\.json.*status:" apps/dashboard/src/app/api/
```

### Step 2: Replace with ApiResponse

Before:

```typescript
return NextResponse.json({ error: error.errors }, { status: 400 });
```

After:

```typescript
return ApiResponse.badRequest(formatZodError(error));
```

### Step 3: Create Zod Error Formatter

```typescript
// apps/dashboard/src/lib/api-response.ts
export function formatZodError(error: ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}
```

---

## Silent Catch Audit

### Intentional (Keep Silent)

```typescript
// Can't delete already-deleted message - expected
message.delete().catch(() => {});

// User DM might be closed - expected
user.send(embed).catch(() => {});
```

### Needs Logging

```typescript
// Database operation - should log
await prisma.member.update(...).catch(() => {});
// Fix: .catch(err => logger.error('Failed to update member', err));
```

---

## Todo List

- [ ] Audit all API routes for direct `NextResponse.json` usage
- [ ] Create `formatZodError` utility
- [ ] Update `welcome/route.ts` - use `ApiResponse.badRequest`
- [ ] Update `moderation/route.ts` - standardize errors
- [ ] Update `leveling/route.ts` - standardize errors
- [ ] Update `tickets/**` routes - standardize errors
- [ ] Review all `.catch(() => {})` patterns
- [ ] Add logging to non-intentional silent catches

---

## Success Criteria

- [ ] All API routes use `ApiResponse` helper
- [ ] Consistent error format: `{ error: string }`
- [ ] No unexpected silent error swallowing
- [ ] All tests pass

---

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                   |
| -------------------------------- | ---------- | ------ | ---------------------------- |
| Client expects different format  | Low        | Medium | Maintain same JSON structure |
| Breaking existing error handling | Low        | Low    | Error format unchanged       |

---

## Next Steps

After completion:

1. Test error responses in Postman/Thunder
2. Verify frontend error handling still works
3. Move to Phase 04 (Performance)
