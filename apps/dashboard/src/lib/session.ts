import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, AuditSource } from '@repo/database';
import { auth } from './auth';
import { generateRequestId } from './audit';

// MANAGE_GUILD permission bit (0x20)
const MANAGE_GUILD_PERMISSION = BigInt(0x20);

/**
 * Get server session from Better Auth
 */
export async function getServerSession() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  return session;
}

/**
 * Get current user ID from session
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id || null;
}

/**
 * Response helpers for consistent error responses
 */
export const ApiResponse = {
  unauthorized: () =>
    NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),

  forbidden: (message = 'Forbidden') =>
    NextResponse.json({ success: false, error: message }, { status: 403 }),

  notFound: (resource = 'Resource') =>
    NextResponse.json({ success: false, error: `${resource} not found` }, { status: 404 }),

  badRequest: (message: string) =>
    NextResponse.json({ success: false, error: message }, { status: 400 }),

  serverError: (message = 'Internal server error') =>
    NextResponse.json({ success: false, error: message }, { status: 500 }),

  tooManyRequests: (message = 'Too many requests') =>
    NextResponse.json({ success: false, error: message }, { status: 429 }),

  success: <T>(data: T, status = 200) =>
    NextResponse.json({ success: true, data }, { status }),

  created: <T>(data: T) =>
    NextResponse.json({ success: true, data }, { status: 201 }),

  error: (message: string, status = 400) =>
    NextResponse.json({ success: false, error: message }, { status }),
};

// Import OAuth module for token refresh support
import { getUserDiscordGuilds } from './discord-oauth';

/**
 * Validate API request: check session and verify user has MANAGE_GUILD permission
 * Returns null if validation passes, or a Response if it fails
 */
export async function validateGuildAccess(guildId: string): Promise<NextResponse | null> {
  // Check session
  const session = await getServerSession();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  // Verify guild exists in database (bot has joined it)
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { id: true, leftAt: true },
  });

  if (!guild || guild.leftAt) {
    return ApiResponse.notFound('Guild');
  }

  // Try to fetch user's Discord guilds and verify permission
  const userGuilds = await getUserDiscordGuilds(session.user.id);
  
  // If user has Discord OAuth linked, verify permission
  if (userGuilds.length > 0) {
    const userGuild = userGuilds.find(g => g.id === guildId);
    
    // Check if user has MANAGE_GUILD permission
    if (!userGuild || (BigInt(userGuild.permissions) & MANAGE_GUILD_PERMISSION) === BigInt(0)) {
      return ApiResponse.forbidden('You do not have permission to manage this guild');
    }
  }
  // If no Discord OAuth tokens, allow access in development mode
  // In production, this should be more strict
  else if (process.env.NODE_ENV === 'production') {
    return ApiResponse.forbidden('Please link your Discord account to manage guilds');
  }

  return null; // Validation passed
}

/**
 * Ensure guild record exists before creating related records (like GuildSettings)
 * This prevents foreign key constraint violations
 */
export async function ensureGuildExists(guildId: string, guildName?: string): Promise<void> {
  await prisma.guild.upsert({
    where: { id: guildId },
    create: { id: guildId, name: guildName || 'Unknown' },
    update: {},
  });
}

/**
 * Extract audit context from a request
 * Used for standardized audit logging
 */
export interface AuditContext {
  userId: string;
  requestId: string;
  source: AuditSource;
  ipAddress?: string;
  userAgent?: string;
}

export async function getAuditContext(request: NextRequest): Promise<AuditContext> {
  const session = await getServerSession();
  const headersList = await headers();
  
  // Get client IP from various headers
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ipAddress = forwardedFor?.split(',')[0] || realIp || undefined;
  
  // Get user agent
  const userAgent = headersList.get('user-agent') || undefined;
  
  return {
    userId: session?.user?.id || 'unknown',
    requestId: generateRequestId(),
    source: 'DASHBOARD' as AuditSource,
    ipAddress,
    userAgent,
  };
}
