/**
 * Environment Validation for Dashboard
 * Validates security-critical env vars at server startup
 */

const REQUIRED_SECURITY_VARS = [
  'MANAGER_API_KEY', // For API calls to manager
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
