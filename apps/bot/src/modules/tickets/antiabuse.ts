/**
 * Ticket Anti-Abuse Module
 * Prevents ticket spam, raid attacks, and abuse
 */

import { prisma } from '@repo/database';
import Redis from 'ioredis';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface AbuseCheck {
  allowed: boolean;
  reason?: string;
  cooldownRemaining?: number; // seconds
}

export interface TicketSettings {
  ticketMaxPerUser: number;
  ticketCooldownMinutes: number;
  ticketAntiRaidEnabled: boolean;
  ticketAntiRaidThreshold: number;
}

// ═══════════════════════════════════════════════
// Redis Instance
// ═══════════════════════════════════════════════

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redis;
}

// ═══════════════════════════════════════════════
// Anti-Abuse Checks
// ═══════════════════════════════════════════════

/**
 * Check if user can create a ticket (anti-abuse)
 */
export async function checkTicketAbuse(
  guildId: string,
  userId: string,
  settings: TicketSettings
): Promise<AbuseCheck> {
  const redis = getRedis();

  // 1. Check open ticket count
  const openTickets = await prisma.ticket.count({
    where: {
      guildId,
      creatorId: userId,
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE'] },
    },
  });

  if (openTickets >= settings.ticketMaxPerUser) {
    return {
      allowed: false,
      reason: `You already have ${openTickets} open ticket(s). Maximum is ${settings.ticketMaxPerUser}.`,
    };
  }

  // 2. Check cooldown
  const cooldownKey = `ticket:cooldown:${guildId}:${userId}`;
  const lastTicket = await redis.get(cooldownKey);

  if (lastTicket) {
    const elapsed = Date.now() - parseInt(lastTicket);
    const cooldownMs = settings.ticketCooldownMinutes * 60 * 1000;

    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
      return {
        allowed: false,
        reason: `Please wait ${formatDuration(remaining)} before creating another ticket.`,
        cooldownRemaining: remaining,
      };
    }
  }

  // 3. Check guild-wide raid detection
  if (settings.ticketAntiRaidEnabled) {
    const raidKey = `ticket:raid:${guildId}`;
    const recentCount = await redis.incr(raidKey);

    if (recentCount === 1) {
      await redis.expire(raidKey, 60); // 1 minute window
    }

    if (recentCount > settings.ticketAntiRaidThreshold) {
      console.warn(`[Tickets] Potential raid in ${guildId}: ${recentCount} tickets in 1 minute`);

      return {
        allowed: false,
        reason: 'Ticket creation temporarily disabled due to high volume. Please try again later.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Set cooldown after successful ticket creation
 */
export async function setTicketCooldown(
  guildId: string,
  userId: string,
  cooldownMinutes: number
): Promise<void> {
  const redis = getRedis();
  const key = `ticket:cooldown:${guildId}:${userId}`;
  await redis.setex(key, cooldownMinutes * 60, Date.now().toString());
}

/**
 * Clear ticket cooldown (admin action)
 */
export async function clearTicketCooldown(
  guildId: string,
  userId: string
): Promise<void> {
  const redis = getRedis();
  const key = `ticket:cooldown:${guildId}:${userId}`;
  await redis.del(key);
}

/**
 * Reset raid counter (admin action)
 */
export async function resetRaidCounter(guildId: string): Promise<void> {
  const redis = getRedis();
  const raidKey = `ticket:raid:${guildId}`;
  await redis.del(raidKey);
}

/**
 * Get current raid status
 */
export async function getRaidStatus(guildId: string): Promise<{
  count: number;
  isRaid: boolean;
  threshold: number;
}> {
  const redis = getRedis();
  const raidKey = `ticket:raid:${guildId}`;
  const count = parseInt((await redis.get(raidKey)) || '0');

  // Get settings for threshold
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
    select: { ticketAntiRaidThreshold: true },
  });

  const threshold = settings?.ticketAntiRaidThreshold || 10;

  return {
    count,
    isRaid: count > threshold,
    threshold,
  };
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
