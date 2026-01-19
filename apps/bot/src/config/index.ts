import 'dotenv/config';

// Validate required env vars FIRST
const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DATABASE_URL'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN as string,
    clientId: process.env.DISCORD_CLIENT_ID as string,
    devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  },
  database: {
    url: process.env.DATABASE_URL as string,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
} as const;
