/**
 * Audit Log API
 * GET - List audit log entries with filters
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma, AuditAction, AuditCategory } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Query params schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  category: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.safeParse(searchParams);

    if (!query.success) {
      return ApiResponse.badRequest(query.error.errors.map(e => e.message).join(', '));
    }

    const { limit, offset, category, action, userId, search, from, to } = query.data;

    // Build where clause
    const where: any = { guildId };

    if (category && category !== 'all') {
      where.category = category;
    }
    if (action && action !== 'all') {
      where.action = action;
    }
    if (userId) {
      where.userId = userId;
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { target: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search } },
      ];
    }

    // Fetch entries with pagination
    const [entries, total] = await Promise.all([
      prisma.auditLogEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLogEntry.count({ where }),
    ]);

    // Get available categories and actions for filters
    const distinctCategories = await prisma.auditLogEntry.findMany({
      where: { guildId },
      distinct: ['category'],
      select: { category: true },
    });

    const distinctActions = await prisma.auditLogEntry.findMany({
      where: { guildId },
      distinct: ['action'],
      select: { action: true },
    });

    return ApiResponse.success({
      items: entries,
      total,
      limit,
      offset,
      hasMore: offset + entries.length < total,
      filters: {
        categories: distinctCategories.map(c => c.category),
        actions: distinctActions.map(a => a.action),
      },
    });
  } catch (error) {
    logger.error(`Error fetching audit log: ${error}`);
    return ApiResponse.serverError();
  }
}
