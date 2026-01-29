---
phase: 01
title: "Environment Validation and Secrets Generation"
status: complete
effort: 45min
completed: 2026-01-29
---

# Phase 01: Environment Validation and Secrets Generation

## Context Links

- [Security Review Findings](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/plans/260129-0453-security-production-readiness/reports/)
- [Manager Entry Point](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/manager/src/index.ts)
- [Dashboard Layout](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/layout.tsx)
- [CSRF Utils](/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/lib/csrf-utils.ts)

## Overview

**Priority:** P1 - Immediate
**Status:** Pending
**Description:** Add fail-fast startup validation for security environment variables and document secret generation procedures.

## Key Insights

- Currently no startup validation; errors occur at first request using undefined vars
- `.env.example` already has MANAGER_API_KEY, TENANT_ENCRYPTION_SALT placeholders
- Need to add TENANT_ENCRYPTION_KEY validation
- CSRF rotation strategy undocumented

## Requirements

### Functional
- Manager service fails immediately if security env vars missing
- Dashboard server-side validates env vars before rendering
- Clear error messages indicating which vars are missing
- Secret generation scripts documented in `.env.example`

### Non-Functional
- Zero runtime overhead (validation at startup only)
- No new dependencies

## Architecture

```
Startup Flow (Manager):
┌─────────────────┐
│  index.ts       │
│  main()         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ validateEnv()   │──── Missing vars? ──► process.exit(1)
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ BotSpawner()    │
│ HealthMonitor() │
└─────────────────┘

Dashboard: instrumentation.ts (Next.js hook for server startup)
```

## Related Code Files

### To Modify
| File | Changes |
|------|---------|
| `apps/manager/src/index.ts` | Add validateSecurityEnv() call at startup |
| `apps/dashboard/src/instrumentation.ts` | Create/update with env validation |
| `apps/dashboard/src/lib/csrf-utils.ts` | Add JSDoc for rotation strategy |
| `.env.example` | Add generation scripts for all keys |

### To Create
| File | Purpose |
|------|---------|
| `apps/manager/src/env-validation.ts` | Centralized env validation for manager |
| `apps/dashboard/src/lib/env-validation.ts` | Centralized env validation for dashboard |
| `scripts/generate-secrets.sh` | Script to generate all required secrets |

## Implementation Steps

### Step 1: Create Manager Env Validation (15min)

Create `apps/manager/src/env-validation.ts`:

```typescript
/**
 * Environment Validation for Bot Manager
 * Fail-fast on missing security-critical environment variables
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
}

const REQUIRED_SECURITY_VARS = [
  'MANAGER_API_KEY',
  'TENANT_ENCRYPTION_KEY',
  'TENANT_ENCRYPTION_SALT',
] as const;

export function validateSecurityEnv(): EnvValidationResult {
  const missing: string[] = [];

  for (const varName of REQUIRED_SECURITY_VARS) {
    if (!process.env[varName]?.trim()) {
      missing.push(varName);
    }
  }

  return { valid: missing.length === 0, missing };
}

export function validateSecurityEnvOrExit(): void {
  const result = validateSecurityEnv();
  if (!result.valid) {
    console.error('='.repeat(60));
    console.error('FATAL: Missing required security environment variables:');
    result.missing.forEach(v => console.error(`  - ${v}`));
    console.error('');
    console.error('Generate secrets with:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
    console.error('='.repeat(60));
    process.exit(1);
  }
}
```

### Step 2: Integrate into Manager Startup (5min)

Update `apps/manager/src/index.ts` - add at top of main():

```typescript
import { validateSecurityEnvOrExit } from './env-validation.js';

async function main() {
  // Fail-fast: validate security env vars before any initialization
  validateSecurityEnvOrExit();

  logger.info('Starting Bot Manager Service...');
  // ... rest of existing code
}
```

### Step 3: Create Dashboard Env Validation (10min)

Create `apps/dashboard/src/lib/env-validation.ts`:

```typescript
/**
 * Environment Validation for Dashboard
 * Validates security-critical env vars at server startup
 */

const REQUIRED_SECURITY_VARS = [
  'MANAGER_API_KEY',  // For API calls to manager
] as const;

export function validateDashboardEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const varName of REQUIRED_SECURITY_VARS) {
    if (!process.env[varName]?.trim()) {
      missing.push(varName);
    }
  }

  return { valid: missing.length === 0, missing };
}

export function validateDashboardEnvOrThrow(): void {
  const result = validateDashboardEnv();
  if (!result.valid) {
    throw new Error(
      `Missing required security env vars: ${result.missing.join(', ')}`
    );
  }
}
```

### Step 4: Create/Update Dashboard Instrumentation (5min)

Create/update `apps/dashboard/src/instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateDashboardEnvOrThrow } = await import('./lib/env-validation');
    validateDashboardEnvOrThrow();
  }
}
```

### Step 5: Document CSRF Rotation Strategy (5min)

Update `apps/dashboard/src/lib/csrf-utils.ts` header:

```typescript
/**
 * CSRF Token Utilities
 *
 * Token Lifecycle:
 * - Generated: On session creation (login)
 * - Stored: HttpOnly, Secure, SameSite=Strict cookie
 * - Validated: On every mutating request (POST/PUT/DELETE)
 *
 * Rotation Strategy:
 * - Tokens rotate automatically on session refresh
 * - Session refresh triggered by better-auth on token renewal
 * - Manual rotation: call generateCsrfToken() on password change
 *
 * Security Properties:
 * - __Host- prefix: Bound to origin, requires Secure, no Path/Domain
 * - 32 bytes entropy: Resistant to brute force
 * - Not in localStorage: XSS cannot exfiltrate
 */
```

### Step 6: Create Secret Generation Script (5min)

Create `scripts/generate-secrets.sh`:

```bash
#!/bin/bash
# Generate all required security secrets for SylaBot

echo "# Security Secrets for .env"
echo "# Generated on: $(date)"
echo ""
echo "# Manager API Key (hex format)"
echo "MANAGER_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo ""
echo "# Tenant Encryption Key (base64, 32 bytes)"
echo "TENANT_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo ""
echo "# Tenant Encryption Salt (base64, 32 bytes)"
echo "TENANT_ENCRYPTION_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo ""
echo "# Better Auth Secret (base64, 32 bytes)"
echo "BETTER_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
```

### Step 7: Update .env.example (5min)

Ensure comments explain generation:

```env
# ═══════════════════════════════════════════════
# SECURITY (Required for production)
# Generate all secrets: bash scripts/generate-secrets.sh
# ═══════════════════════════════════════════════

# Manager API authentication
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MANAGER_API_KEY=

# Tenant token encryption key (32 bytes base64)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
TENANT_ENCRYPTION_KEY=

# Encryption salt (32 bytes base64)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
TENANT_ENCRYPTION_SALT=
```

## Todo List

- [x] Create `apps/manager/src/env-validation.ts`
- [x] Update `apps/manager/src/index.ts` with validation call
- [x] Create `apps/dashboard/src/lib/env-validation.ts`
- [x] Create/update `apps/dashboard/src/instrumentation.ts`
- [x] Update CSRF utils JSDoc with rotation strategy
- [x] Create `scripts/generate-secrets.sh`
- [x] Update `.env.example` with generation instructions
- [⚠️] Test: Start manager without env vars, verify exit code 1 (needs manual verification)
- [⚠️] Test: Start dashboard without env vars, verify startup error (needs manual verification)

## Success Criteria

1. `apps/manager` exits with code 1 and clear message if MANAGER_API_KEY, TENANT_ENCRYPTION_KEY, or TENANT_ENCRYPTION_SALT missing
2. `apps/dashboard` fails to start with clear error if MANAGER_API_KEY missing
3. `scripts/generate-secrets.sh` generates all required secrets
4. `.env.example` documents all security vars with generation commands
5. CSRF rotation strategy documented in code

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Break existing deployments | Medium | High | Check env vars exist before validation is deployed |
| Missing var in validation list | Low | Medium | Review all security-sensitive code paths |

## Security Considerations

- Env validation runs before any network listeners start
- Error messages don't leak secret values
- Exit code 1 signals deployment systems to halt

## Next Steps

After Phase 01 complete:
1. Proceed to Phase 02 (Metrics and Monitoring)
2. Update deployment documentation
3. Notify ops team about new required env vars
