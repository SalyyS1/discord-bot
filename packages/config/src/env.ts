import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),

  // Discord
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().optional(),

  // R2 Storage (optional)
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Dashboard (optional)
  DASHBOARD_PORT: z.coerce.number().default(3000),
  DASHBOARD_SECRET: z.string().optional(),

  // Bot API (for dashboard to communicate with bot)
  BOT_API_URL: z.string().url().optional().default('http://localhost:3000'),
  BOT_API_SECRET: z.string().optional().default('internal-secret'),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  // Multi-Tenant Security
  TENANT_ENCRYPTION_KEY: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 */
export function loadEnv(): Env {
  // Accept both DISCORD_TOKEN (canonical) and DISCORD_BOT_TOKEN (legacy/alt) to avoid production env drift.
  const mergedEnv = {
    ...process.env,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN ?? process.env.DISCORD_BOT_TOKEN,
  };

  const result = envSchema.safeParse(mergedEnv);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return result.data;
}

// Export parsed env (lazy loaded)
let _env: Env | null = null;

export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!_env) {
      _env = loadEnv();
    }
    return _env[prop as keyof Env];
  },
});
