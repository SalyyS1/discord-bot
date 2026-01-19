import { GuildMember } from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

/**
 * Auto-role assignment module
 */
export class AutoRoleModule {
  /**
   * Assign configured auto-roles to a new member
   * @param member - The guild member
   * @param skipVerification - If true, skip verification check (used after manual verification)
   */
  static async assignRoles(
    member: GuildMember,
    skipVerification = false
  ): Promise<void> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!settings?.autoRoleIds || settings.autoRoleIds.length === 0) return;

    // If verification is required and not skipping, don't auto-assign
    if (settings.verifiedRoleId && !skipVerification) {
      logger.debug(
        `Skipping auto-role for ${member.user.tag} - verification required`
      );
      return;
    }

    try {
      // Filter to only roles that exist and member doesn't have
      const rolesToAdd = settings.autoRoleIds.filter((roleId) => {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) {
          logger.warn(`Auto-role ${roleId} not found in guild ${member.guild.id}`);
          return false;
        }
        return !member.roles.cache.has(roleId);
      });

      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd, 'Auto-role on join');
        logger.info(
          `Assigned ${rolesToAdd.length} auto-roles to ${member.user.tag} in ${member.guild.name}`
        );
      }
    } catch (error) {
      logger.error('Failed to assign auto-roles:', error);
    }
  }

  /**
   * Add a role to the auto-role list
   */
  static async addAutoRole(guildId: string, roleId: string): Promise<boolean> {
    try {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId },
      });

      const autoRoles = new Set(settings?.autoRoleIds || []);
      if (autoRoles.has(roleId)) return false; // Already exists

      autoRoles.add(roleId);

      await prisma.guildSettings.upsert({
        where: { guildId },
        create: { guildId, autoRoleIds: Array.from(autoRoles) },
        update: { autoRoleIds: Array.from(autoRoles) },
      });

      return true;
    } catch (error) {
      logger.error('Failed to add auto-role:', error);
      return false;
    }
  }

  /**
   * Remove a role from the auto-role list
   */
  static async removeAutoRole(guildId: string, roleId: string): Promise<boolean> {
    try {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId },
      });

      const autoRoles = new Set(settings?.autoRoleIds || []);
      if (!autoRoles.has(roleId)) return false; // Doesn't exist

      autoRoles.delete(roleId);

      await prisma.guildSettings.update({
        where: { guildId },
        data: { autoRoleIds: Array.from(autoRoles) },
      });

      return true;
    } catch (error) {
      logger.error('Failed to remove auto-role:', error);
      return false;
    }
  }

  /**
   * Get all auto-roles for a guild
   */
  static async getAutoRoles(guildId: string): Promise<string[]> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });
    return settings?.autoRoleIds || [];
  }
}
