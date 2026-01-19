import { betterAuth } from 'better-auth';
import { prisma } from '@repo/database';

export const auth = betterAuth({
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  trustedOrigins: ['http://localhost:3000'],
});

export type Session = typeof auth.$Infer.Session;
