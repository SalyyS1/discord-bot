/**
 * Individual Rating Management API
 * GET - Get a single rating
 * PATCH - Update rating (approve, feature)
 * DELETE - Remove rating
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse, getAuditContext } from '@/lib/session';
import { recordAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Update schema
const updateSchema = z.object({
  approved: z.boolean().optional(),
  featured: z.boolean().optional(),
}).refine(data => data.approved !== undefined || data.featured !== undefined, {
  message: 'At least one field (approved or featured) must be provided',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; ratingId: string }> }
) {
  const { guildId, ratingId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const rating = await prisma.ticketRating.findFirst({
      where: {
        id: ratingId,
        ticket: { guildId },
      },
      include: {
        ticket: {
          select: {
            id: true,
            channelId: true,
            closedAt: true,
            closedBy: true,
            claimedBy: true,
            member: {
              select: {
                discordId: true,
              },
            },
          },
        },
      },
    });

    if (!rating) {
      return ApiResponse.notFound('Rating not found');
    }

    return ApiResponse.success(rating);
  } catch (error) {
    logger.error(`Error fetching rating: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; ratingId: string }> }
) {
  const { guildId, ratingId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return ApiResponse.badRequest(parsed.error.errors.map(e => e.message).join(', '));
    }

    // Verify rating belongs to this guild
    const existing = await prisma.ticketRating.findFirst({
      where: {
        id: ratingId,
        ticket: { guildId },
      },
    });

    if (!existing) {
      return ApiResponse.notFound('Rating not found');
    }

    // Update rating
    const updated = await prisma.ticketRating.update({
      where: { id: ratingId },
      data: parsed.data,
      include: {
        ticket: {
          select: {
            id: true,
            channelId: true,
          },
        },
      },
    });

    // Record audit log
    const auditContext = await getAuditContext(request);

    if (parsed.data.approved !== undefined) {
      await recordAuditLog({
        guildId,
        ...auditContext,
        action: parsed.data.approved ? 'RATING_APPROVE' : 'RATING_REMOVE',
        category: 'RATINGS',
        target: ratingId,
        before: { approved: existing.approved },
        after: { approved: parsed.data.approved },
      });
    }

    if (parsed.data.featured !== undefined) {
      await recordAuditLog({
        guildId,
        ...auditContext,
        action: 'RATING_FEATURE',
        category: 'RATINGS',
        target: ratingId,
        before: { featured: existing.featured },
        after: { featured: parsed.data.featured },
      });
    }

    return ApiResponse.success(updated);
  } catch (error) {
    logger.error(`Error updating rating: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; ratingId: string }> }
) {
  const { guildId, ratingId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Verify rating belongs to this guild
    const existing = await prisma.ticketRating.findFirst({
      where: {
        id: ratingId,
        ticket: { guildId },
      },
    });

    if (!existing) {
      return ApiResponse.notFound('Rating not found');
    }

    // Delete rating
    await prisma.ticketRating.delete({
      where: { id: ratingId },
    });

    // Record audit log
    const auditContext = await getAuditContext(request);
    await recordAuditLog({
      guildId,
      ...auditContext,
      action: 'RATING_REMOVE',
      category: 'RATINGS',
      target: ratingId,
      before: {
        stars: existing.stars,
        review: existing.review,
        approved: existing.approved,
        featured: existing.featured,
      },
      after: null,
    });

    return ApiResponse.success({ deleted: true });
  } catch (error) {
    logger.error(`Error deleting rating: ${error}`);
    return ApiResponse.serverError();
  }
}
