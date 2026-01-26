import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const productUpdateSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    emoji: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    assignedRoleIds: z.array(z.string()).optional(),
    assignedUserIds: z.array(z.string()).optional(),
    sortOrder: z.number().optional(),
    enabled: z.boolean().optional(),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string; productId: string }> }
) {
    const { guildId, productId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const body = await request.json();
        const validated = productUpdateSchema.parse(body);

        const product = await prisma.ticketProduct.update({
            where: {
                id: productId,
                guildId, // Ensure ownership
            },
            data: validated,
        });

        return ApiResponse.success(product);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest(error.errors[0]?.message || 'Validation failed');
        }
        logger.error(`Error updating ticket product: ${error}`);
        return ApiResponse.serverError();
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string; productId: string }> }
) {
    const { guildId, productId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        await prisma.ticketProduct.delete({
            where: {
                id: productId,
                guildId, // Ensure ownership
            },
        });

        return ApiResponse.success({ deleted: true });
    } catch (error) {
        logger.error(`Error deleting ticket product: ${error}`);
        return ApiResponse.serverError();
    }
}
