import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const productSchema = z.object({
    name: z.string().min(1).max(50),
    emoji: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    assignedRoleIds: z.array(z.string()).default([]),
    assignedUserIds: z.array(z.string()).default([]),
    sortOrder: z.number().optional(),
    enabled: z.boolean().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const products = await prisma.ticketProduct.findMany({
            where: { guildId },
            orderBy: { sortOrder: 'asc' },
        });

        return ApiResponse.success(products);
    } catch (error) {
        logger.error(`Error fetching ticket products: ${error}`);
        return ApiResponse.serverError();
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const body = await request.json();
        const validated = productSchema.parse(body);

        await ensureGuildExists(guildId);

        // Get max sort order if not provided
        if (validated.sortOrder === undefined) {
            const maxOrder = await prisma.ticketProduct.findFirst({
                where: { guildId },
                orderBy: { sortOrder: 'desc' },
                select: { sortOrder: true },
            });
            validated.sortOrder = (maxOrder?.sortOrder ?? -1) + 1;
        }

        const product = await prisma.ticketProduct.create({
            data: {
                guildId,
                ...validated,
            },
        });

        return ApiResponse.success(product);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest(error.errors.map(e => e.message).join(', '));
        }
        // Check uniqueness constraint
        if ((error as any).code === 'P2002') {
            return ApiResponse.badRequest('A product with this name already exists.');
        }
        logger.error(`Error creating ticket product: ${error}`);
        return ApiResponse.serverError();
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Support batch update for sort orders or single update
    // For now simple single update via ID in query param or body? 
    // Usually PUT is for full resource replacement.
    // Let's use PATCH for partial per resource, relying on `[productId]/route.ts`...
    // But here I'm in the collection route.

    // If this is for reordering, we might expect a list of { id, sortOrder }.
    return ApiResponse.badRequest('Method not implemented. Use PATCH on specific resource.');
}
