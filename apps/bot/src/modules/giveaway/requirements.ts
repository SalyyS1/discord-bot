import { GuildMember } from 'discord.js';
import { prisma } from '../../lib/prisma.js';

interface Requirements {
  roleIds: string[];
  minInvites: number;
  minLevel: number;
  minReputation: number;
}

interface RequirementResult {
  eligible: boolean;
  missing: string[];
}

/**
 * Giveaway entry requirements checker
 */
export class GiveawayRequirements {
  /**
   * Check if a member meets all giveaway requirements
   */
  static async check(
    member: GuildMember,
    requirements: Requirements
  ): Promise<RequirementResult> {
    const missing: string[] = [];

    // Check required roles
    if (requirements.roleIds.length > 0) {
      const hasAllRoles = requirements.roleIds.every((roleId) =>
        member.roles.cache.has(roleId)
      );
      if (!hasAllRoles) {
        missing.push('Required role(s)');
      }
    }

    // Get member data from database
    const memberData = await prisma.member.findUnique({
      where: {
        discordId_guildId: {
          discordId: member.id,
          guildId: member.guild.id,
        },
      },
    });

    // Check invite count
    if (requirements.minInvites > 0) {
      const inviteCount = memberData?.inviteCount ?? 0;
      if (inviteCount < requirements.minInvites) {
        missing.push(
          `${requirements.minInvites} invites (you have ${inviteCount})`
        );
      }
    }

    // Check level
    if (requirements.minLevel > 0) {
      const level = memberData?.level ?? 0;
      if (level < requirements.minLevel) {
        missing.push(`Level ${requirements.minLevel} (you are ${level})`);
      }
    }

    // Check reputation
    if (requirements.minReputation > 0) {
      const reputation = memberData?.reputation ?? 0;
      if (reputation < requirements.minReputation) {
        missing.push(
          `${requirements.minReputation} reputation (you have ${reputation})`
        );
      }
    }

    return {
      eligible: missing.length === 0,
      missing,
    };
  }

  /**
   * Format requirements for display in embed
   */
  static formatRequirements(
    roleIds: string[],
    minInvites: number,
    minLevel: number,
    minReputation: number
  ): string {
    const reqs: string[] = [];

    if (roleIds.length > 0) {
      reqs.push(`Roles: ${roleIds.map((id) => `<@&${id}>`).join(', ')}`);
    }
    if (minInvites > 0) {
      reqs.push(`Invites: ${minInvites}+`);
    }
    if (minLevel > 0) {
      reqs.push(`Level: ${minLevel}+`);
    }
    if (minReputation > 0) {
      reqs.push(`Reputation: ${minReputation}+`);
    }

    return reqs.length > 0 ? reqs.join('\n') : 'None';
  }
}
