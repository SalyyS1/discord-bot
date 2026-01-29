/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (before any request handling)
 */

export async function register() {
  // Only run on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateDashboardEnvOrThrow } = await import('./lib/env-validation');
    validateDashboardEnvOrThrow();
  }
}
