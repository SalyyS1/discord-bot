/**
 * Template Lifecycle Management
 * Draft → Published lifecycle with version history
 */

import { prisma, type MessageTemplate, type TemplateVersion, Prisma } from '@repo/database';
import type { MessageConfig } from '@repo/types';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type TemplateWithVersions = MessageTemplate & {
  versions: TemplateVersion[];
};

// ═══════════════════════════════════════════════
// Draft Operations
// ═══════════════════════════════════════════════

/**
 * Save a template as draft (creates or updates)
 */
export async function saveDraft(
  guildId: string,
  name: string,
  config: MessageConfig,
  displayName?: string
): Promise<MessageTemplate> {
  return prisma.messageTemplate.upsert({
    where: { guildId_name: { guildId, name } },
    update: {
      config: config as unknown as Prisma.InputJsonValue,
      displayName,
      status: 'DRAFT',
      updatedAt: new Date(),
    },
    create: {
      guildId,
      name,
      displayName,
      config: config as unknown as Prisma.InputJsonValue,
      status: 'DRAFT',
    },
  });
}

/**
 * Get a template by name
 */
export async function getTemplate(
  guildId: string,
  name: string
): Promise<TemplateWithVersions | null> {
  return prisma.messageTemplate.findUnique({
    where: { guildId_name: { guildId, name } },
    include: { versions: { orderBy: { version: 'desc' }, take: 10 } },
  });
}

/**
 * List all templates for a guild
 */
export async function listTemplates(
  guildId: string
): Promise<MessageTemplate[]> {
  return prisma.messageTemplate.findMany({
    where: { guildId },
    orderBy: { name: 'asc' },
  });
}

// ═══════════════════════════════════════════════
// Publish Operations
// ═══════════════════════════════════════════════

/**
 * Publish a template (save current to version history, update status)
 */
export async function publishTemplate(
  guildId: string,
  name: string,
  userId: string
): Promise<MessageTemplate> {
  const template = await prisma.messageTemplate.findUnique({
    where: { guildId_name: { guildId, name } },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // Save current version to history
  await prisma.templateVersion.create({
    data: {
      templateId: template.id,
      version: template.version,
      config: template.config as Prisma.InputJsonValue,
      publishedBy: userId,
    },
  });

  // Update template
  return prisma.messageTemplate.update({
    where: { id: template.id },
    data: {
      status: 'PUBLISHED',
      version: template.version + 1,
      publishedAt: new Date(),
      enabled: true,
    },
  });
}

// ═══════════════════════════════════════════════
// Rollback Operations
// ═══════════════════════════════════════════════

/**
 * Rollback template to a previous version
 */
export async function rollbackTemplate(
  guildId: string,
  name: string,
  targetVersion: number
): Promise<MessageTemplate> {
  const template = await prisma.messageTemplate.findUnique({
    where: { guildId_name: { guildId, name } },
    include: { versions: true },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  const targetVersionData = template.versions.find(
    (v) => v.version === targetVersion
  );
  if (!targetVersionData) {
    throw new Error(`Version ${targetVersion} not found`);
  }

  return prisma.messageTemplate.update({
    where: { id: template.id },
    data: {
      config: targetVersionData.config as Prisma.InputJsonValue,
      status: 'DRAFT', // Requires re-publish after rollback
    },
  });
}

// ═══════════════════════════════════════════════
// Archive Operations
// ═══════════════════════════════════════════════

/**
 * Archive a template
 */
export async function archiveTemplate(
  guildId: string,
  name: string
): Promise<MessageTemplate> {
  return prisma.messageTemplate.update({
    where: { guildId_name: { guildId, name } },
    data: {
      status: 'ARCHIVED',
      enabled: false,
    },
  });
}

/**
 * Restore an archived template to draft
 */
export async function restoreTemplate(
  guildId: string,
  name: string
): Promise<MessageTemplate> {
  return prisma.messageTemplate.update({
    where: { guildId_name: { guildId, name } },
    data: {
      status: 'DRAFT',
    },
  });
}

// ═══════════════════════════════════════════════
// Delete Operations
// ═══════════════════════════════════════════════

/**
 * Delete a template and all its versions
 */
export async function deleteTemplate(
  guildId: string,
  name: string
): Promise<void> {
  await prisma.messageTemplate.delete({
    where: { guildId_name: { guildId, name } },
  });
}

// ═══════════════════════════════════════════════
// Copy Operations
// ═══════════════════════════════════════════════

/**
 * Copy a template to a new name
 */
export async function copyTemplate(
  guildId: string,
  sourceName: string,
  targetName: string
): Promise<MessageTemplate> {
  const source = await prisma.messageTemplate.findUnique({
    where: { guildId_name: { guildId, name: sourceName } },
  });

  if (!source) {
    throw new Error('Source template not found');
  }

  return prisma.messageTemplate.create({
    data: {
      guildId,
      name: targetName,
      displayName: `${source.displayName || source.name} (Copy)`,
      config: source.config as Prisma.InputJsonValue,
      status: 'DRAFT',
    },
  });
}

// ═══════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════

/**
 * Get published config for a template (for bot to use)
 * Returns null if not published
 */
export async function getPublishedConfig(
  guildId: string,
  name: string
): Promise<MessageConfig | null> {
  const template = await prisma.messageTemplate.findUnique({
    where: { guildId_name: { guildId, name } },
    select: { config: true, status: true, enabled: true },
  });

  if (!template || template.status !== 'PUBLISHED' || !template.enabled) {
    return null;
  }

  return template.config as unknown as MessageConfig;
}

/**
 * Get version history for a template
 */
export async function getVersionHistory(
  guildId: string,
  name: string,
  limit = 20
): Promise<TemplateVersion[]> {
  const template = await prisma.messageTemplate.findUnique({
    where: { guildId_name: { guildId, name } },
    select: { id: true },
  });

  if (!template) {
    return [];
  }

  return prisma.templateVersion.findMany({
    where: { templateId: template.id },
    orderBy: { version: 'desc' },
    take: limit,
  });
}
