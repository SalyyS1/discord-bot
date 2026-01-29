import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@repo/database';

// Get app URL dynamically - falls back to env var or default
function getAppUrl(): string {
  // In production, use env var
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Default for development
  return 'http://localhost:3000';
}

const appUrl = getAppUrl();

// Trusted origins - include common dev ports
const trustedOrigins = [
  appUrl,
  'https://sylabot.site',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: false, // Disabled - using Discord only
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      scope: ['identify', 'email', 'guilds'],
    },
  },
  session: {
    // Reduced from 7 days to 24 hours
    expiresIn: 60 * 60 * 24, // 24 hours

    // Sliding expiration - refresh session on activity
    updateAge: 60 * 60, // Refresh every hour if active

    // Cookie cache for performance
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  trustedOrigins,
});

export type Session = typeof auth.$Infer.Session;
