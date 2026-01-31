/**
 * Bulk Rating Operations API
 * POST - Perform bulk operations on ratings (approve, feature, remove)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse, getAuditContext } from '@/lib/session';
import { recordAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Bulk operation schema
const bulkSchema = z.object({
  action: z.enum(['approve', 'unapprove', 'feature', 'unfeature', 'delete']),
  ratingIds: z.array(z.string()).min(1).max(50),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      return ApiResponse.badRequest(parsed.error.errors.map(e => e.message).join(', '));
    }

    const { action, ratingIds } = parsed.data;

    // Verify all ratings belong to this guild
    const existingRatings = await prisma.ticketRating.findMany({
      where: {
        id: { in: ratingIds },
        ticket: { guildId },
      },
      select: {
        id: true,
        stars: true,
        approved: true,
        featured: true,
      },
    });

    const validIds = existingRatings.map(r => r.id);
    const invalidIds = ratingIds.filter(id => !validIds.includes(id));

    if (invalidIds.length > 0) {
      return ApiResponse.badRequest(`Invalid rating IDs: ${invalidIds.join(', ')}`);
    }

    // Perform the bulk action
    let result: { count: number };
    const auditContext = await getAuditContext(request);

    switch (action) {
      case 'approve':
        result = await prisma.ticketRating.updateMany({
          where: { id: { in: validIds } },
          data: { approved: true },
        });
        await recordAuditLog({
          guildId,
          ...auditContext,
          action: 'RATING_APPROVE',
          category: 'RATINGS',
          target: `bulk:${validIds.length}`,
          before: { ratingIds: validIds },
          after: { approved: true },
        });
        break;

      case 'unapprove':
        result = await prisma.ticketRating.updateMany({
          where: { id: { in: validIds } },
          data: { approved: false },
        });
        await recordAuditLog({
          guildId,
          ...auditContext,
          action: 'RATING_REMOVE',
          category: 'RATINGS',
          target: `bulk:${validIds.length}`,
          before: { ratingIds: validIds },
          after: { approved: false },
        });
        break;

      case 'feature':
        result = await prisma.ticketRating.updateMany({
          where: { id: { in: validIds } },
          data: { featured: true, approved: true }, // Auto-approve when featuring
        });
        await recordAuditLog({
          guildId,
          ...auditContext,
          action: 'RATING_FEATURE',
          category: 'RATINGS',
          target: `bulk:${validIds.length}`,
          before: { ratingIds: validIds },
          after: { featured: true, approved: true },
        });
        break;

      case 'unfeature':
        result = await prisma.ticketRating.updateMany({
          where: { id: { in: validIds } },
          data: { featured: false },
        });
        await recordAuditLog({
          guildId,
          ...auditContext,
          action: 'RATING_FEATURE',
          category: 'RATINGS',
          target: `bulk:${validIds.length}`,
          before: { ratingIds: validIds },
          after: { featured: false },
        });
        break;

      case 'delete':
        result = await prisma.ticketRating.deleteMany({
          where: { id: { in: validIds } },
        });
        await recordAuditLog({
          guildId,
          ...auditContext,
          action: 'RATING_REMOVE',
          category: 'RATINGS',
          target: `bulk:${validIds.length}`,
          before: {
            ratingIds: validIds,
            ratings: existingRatings,
          },
          after: null,
        });
        break;

      default:
        return ApiResponse.badRequest('Invalid action');
    }

    return ApiResponse.success({
      action,
      affected: result.count,
      ratingIds: validIds,
    });
  } catch (error) {
    logger.error(`Error performing bulk rating operation: ${error}`);
    return ApiResponse.serverError();
  }
}
