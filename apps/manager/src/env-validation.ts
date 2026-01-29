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
    console.error('  bash scripts/generate-secrets.sh');
    console.error('Or manually:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
    console.error('='.repeat(60));
    process.exit(1);
  }
}
