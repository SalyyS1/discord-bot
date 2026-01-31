import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// PATCH - Update panel
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; panelId: string }> }
) {
  const { guildId, panelId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const { name, title, description, color, imageUrl, thumbnail, footer, componentType, buttonStyle, selectPlaceholder, enabled, categories } = body;

    // Update panel basic info
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (footer !== undefined) updateData.footer = footer;
    if (componentType !== undefined) updateData.componentType = componentType;
    if (buttonStyle !== undefined) updateData.buttonStyle = buttonStyle;
    if (selectPlaceholder !== undefined) updateData.selectPlaceholder = selectPlaceholder;
    if (enabled !== undefined) updateData.enabled = enabled;

    // Update panel
    await prisma.ticketPanel.update({
      where: { id: panelId, guildId },
      data: updateData,
    });

    // If categories are provided, sync them
    if (categories !== undefined) {
      // Delete existing categories not in the new list
      const categoryIds = categories.filter((c: { id: string }) => !c.id.startsWith('temp-')).map((c: { id: string }) => c.id);
      await prisma.ticketCategory.deleteMany({
        where: {
          panelId,
          id: { notIn: categoryIds },
        },
      });

      // Upsert categories
      for (const cat of categories) {
        if (cat.id.startsWith('temp-')) {
          // Create new category
          await prisma.ticketCategory.create({
            data: {
              panelId,
              guildId,
              name: cat.name,
              emoji: cat.emoji,
              description: cat.description,
              pingRoleIds: cat.pingRoleIds || [],
              pingUserIds: cat.pingUserIds || [],
              categoryChannelId: cat.categoryChannelId,
              namingPattern: cat.namingPattern,
              formEnabled: cat.formEnabled || false,
              formQuestions: cat.formQuestions,
              claimEnabled: cat.claimEnabled ?? true,
              autoClaimRole: cat.autoClaimRole,
              sortOrder: cat.sortOrder || 0,
              enabled: cat.enabled ?? true,
            },
          });
        } else {
          // Update existing category
          await prisma.ticketCategory.update({
            where: { id: cat.id },
            data: {
              name: cat.name,
              emoji: cat.emoji,
              description: cat.description,
              pingRoleIds: cat.pingRoleIds || [],
              pingUserIds: cat.pingUserIds || [],
              categoryChannelId: cat.categoryChannelId,
              namingPattern: cat.namingPattern,
              formEnabled: cat.formEnabled || false,
              formQuestions: cat.formQuestions,
              claimEnabled: cat.claimEnabled ?? true,
              autoClaimRole: cat.autoClaimRole,
              sortOrder: cat.sortOrder || 0,
              enabled: cat.enabled ?? true,
            },
          });
        }
      }
    }

    // Fetch updated panel with categories
    const updatedPanel = await prisma.ticketPanel.findUnique({
      where: { id: panelId },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return ApiResponse.success(updatedPanel);
  } catch (error) {
    logger.error(`Failed to update panel: ${error}`);
    return ApiResponse.serverError();
  }
}

// DELETE - Delete panel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; panelId: string }> }
) {
  const { guildId, panelId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    await prisma.ticketPanel.delete({
      where: { id: panelId, guildId },
    });

    return ApiResponse.success({ deleted: true });
  } catch (error) {
    logger.error(`Failed to delete panel: ${error}`);
    return ApiResponse.serverError();
  }
}
