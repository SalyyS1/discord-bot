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
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 */
export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

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
