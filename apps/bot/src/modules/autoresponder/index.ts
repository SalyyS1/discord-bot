import { Message, EmbedBuilder, GuildMember } from 'discord.js';
import { prisma, TriggerType, ResponseType } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../utils/logger.js';

interface RoleResponse {
  roleId: string;
  roleName?: string;
  response: string;
}

interface UserResponse {
  userId: string;
  username?: string;
  response: string;
}

interface AutoResponderData {
  id: string;
  guildId: string;
  trigger: string;
  triggerType: TriggerType;
  response: string;
  responseType: ResponseType;
  cooldownSeconds: number;
  enabled: boolean;
  // Advanced features
  mentionUser: boolean;
  deleteOriginal: boolean;
  replyToMessage: boolean;
  dmUser: boolean;
  // Tone & Style
  tone: string | null;
  pronoun: string | null;
  emoji: boolean;
  // Role-based responses
  roleResponses: RoleResponse[] | null;
  // User-specific responses
  userResponses: UserResponse[] | null;
  // Restrictions
  allowedRoleIds: string[];
  blockedRoleIds: string[];
  allowedChannelIds: string[];
  blockedChannelIds: string[];
  allowedUserIds: string[];
  blockedUserIds: string[];
  // Random responses
  randomResponses: string[];
  // Tracking
  usageCount: number;
  lastUsedAt: Date | null;
}

/**
 * Keyword-based auto-responder module with advanced features
 */
export class AutoResponderModule {
  /**
   * Check message for triggers and respond
   */
  static async check(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const triggers = await prisma.autoResponder.findMany({
      where: { guildId: message.guild.id, enabled: true },
    }) as unknown as AutoResponderData[];

    for (const trigger of triggers) {
      // Check restrictions first
      if (!this.passesRestrictions(message, trigger)) {
        continue;
      }

      const matches = this.matchesTrigger(
        message.content,
        trigger.trigger,
        trigger.triggerType
      );

      if (matches) {
        // Check cooldown
        const cooldownKey = `ar:${trigger.id}:${message.channel.id}`;
        try {
          const onCooldown = await redis.exists(cooldownKey);
          if (onCooldown) continue;

          // Set cooldown
          if (trigger.cooldownSeconds > 0) {
            await redis.setex(cooldownKey, trigger.cooldownSeconds, '1');
          }
        } catch {
          // Redis unavailable, continue without cooldown
        }

        // Determine response based on role/user/random
        const response = this.determineResponse(message, trigger);

        // Send response
        await this.sendResponse(message, response, trigger);

        // Update usage stats
        await this.updateUsage(trigger.id);

        return true;
      }
    }

    return false;
  }

  /**
   * Check if message passes restrictions
   */
  private static passesRestrictions(message: Message, trigger: AutoResponderData): boolean {
    const member = message.member;
    if (!member) return false;

    // Check blocked users
    if (trigger.blockedUserIds.length > 0 && trigger.blockedUserIds.includes(message.author.id)) {
      return false;
    }

    // Check allowed users (if set, only these users can trigger)
    if (trigger.allowedUserIds.length > 0 && !trigger.allowedUserIds.includes(message.author.id)) {
      return false;
    }

    // Check blocked roles
    if (trigger.blockedRoleIds.length > 0) {
      const hasBlockedRole = member.roles.cache.some(r => trigger.blockedRoleIds.includes(r.id));
      if (hasBlockedRole) return false;
    }

    // Check allowed roles (if set, user must have at least one)
    if (trigger.allowedRoleIds.length > 0) {
      const hasAllowedRole = member.roles.cache.some(r => trigger.allowedRoleIds.includes(r.id));
      if (!hasAllowedRole) return false;
    }

    // Check blocked channels
    if (trigger.blockedChannelIds.length > 0 && trigger.blockedChannelIds.includes(message.channel.id)) {
      return false;
    }

    // Check allowed channels (if set, must be in one of them)
    if (trigger.allowedChannelIds.length > 0 && !trigger.allowedChannelIds.includes(message.channel.id)) {
      return false;
    }

    return true;
  }

  /**
   * Determine the response based on role/user overrides or random
   */
  private static determineResponse(message: Message, trigger: AutoResponderData): string {
    const member = message.member;

    // Check user-specific response first (highest priority)
    if (trigger.userResponses && trigger.userResponses.length > 0) {
      const userResponse = trigger.userResponses.find(ur => ur.userId === message.author.id);
      if (userResponse) {
        return this.processVariables(userResponse.response, message);
      }
    }

    // Check role-specific response (check highest role first)
    if (trigger.roleResponses && trigger.roleResponses.length > 0 && member) {
      // Sort by role position (highest first)
      const memberRoleIds = member.roles.cache.map(r => r.id);
      for (const roleResponse of trigger.roleResponses) {
        if (memberRoleIds.includes(roleResponse.roleId)) {
          return this.processVariables(roleResponse.response, message);
        }
      }
    }

    // Random response
    if (trigger.responseType === 'RANDOM' && trigger.randomResponses.length > 0) {
      const randomIndex = Math.floor(Math.random() * trigger.randomResponses.length);
      return this.processVariables(trigger.randomResponses[randomIndex], message);
    }

    // Default response
    return this.processVariables(trigger.response, message);
  }

  /**
   * Process variables in response text
   */
  private static processVariables(text: string, message: Message): string {
    return text
      .replace(/{user}/g, `<@${message.author.id}>`)
      .replace(/{username}/g, message.author.username)
      .replace(/{displayname}/g, message.member?.displayName || message.author.username)
      .replace(/{server}/g, message.guild?.name || 'Server')
      .replace(/{channel}/g, `<#${message.channel.id}>`)
      .replace(/{time}/g, new Date().toLocaleTimeString())
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{membercount}/g, message.guild?.memberCount?.toString() || '0');
  }

  /**
   * Check if message content matches trigger
   */
  private static matchesTrigger(
    content: string,
    trigger: string,
    type: TriggerType
  ): boolean {
    const lowerContent = content.toLowerCase();
    const lowerTrigger = trigger.toLowerCase();

    switch (type) {
      case TriggerType.EXACT:
        return lowerContent === lowerTrigger;
      case TriggerType.CONTAINS:
        return lowerContent.includes(lowerTrigger);
      case TriggerType.STARTS_WITH:
        return lowerContent.startsWith(lowerTrigger);
      case TriggerType.ENDS_WITH:
        return lowerContent.endsWith(lowerTrigger);
      case TriggerType.REGEX:
        try {
          const regex = new RegExp(trigger, 'i');
          return regex.test(content);
        } catch {
          return false;
        }
      case TriggerType.WILDCARD:
        // Convert wildcard pattern to regex
        // * matches any characters, ? matches single character
        try {
          const escapedTrigger = lowerTrigger
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
            .replace(/\*/g, '.*') // * -> .*
            .replace(/\?/g, '.'); // ? -> .
          const regex = new RegExp(`^${escapedTrigger}$`, 'i');
          return regex.test(content);
        } catch {
          return lowerContent.includes(lowerTrigger);
        }
      default:
        // Fallback: treat as contains
        return lowerContent.includes(lowerTrigger);
    }
  }

  /**
   * Send auto-response with all advanced features
   */
  private static async sendResponse(
    message: Message,
    response: string,
    trigger: AutoResponderData
  ): Promise<void> {
    try {
      // Check if channel supports sending messages
      if (!('send' in message.channel)) return;

      // Build response content
      let content = response;

      // Add mention if enabled
      if (trigger.mentionUser) {
        content = `<@${message.author.id}> ${content}`;
      }

      // Send based on response type
      const sendOptions: { content?: string; embeds?: EmbedBuilder[]; reply?: { messageReference: string } } = {};

      if (trigger.responseType === ResponseType.EMBED) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setDescription(response);
        
        if (trigger.mentionUser) {
          sendOptions.content = `<@${message.author.id}>`;
        }
        sendOptions.embeds = [embed];
      } else if (trigger.responseType === ResponseType.REACTION) {
        // For reaction type, just react and return
        await message.react(response).catch(() => {});
        return;
      } else {
        // TEXT or RANDOM (both send text)
        sendOptions.content = content;
      }

      // Reply to message or send normally
      if (trigger.replyToMessage) {
        await message.reply(sendOptions);
      } else {
        await message.channel.send(sendOptions);
      }

      // Delete original message if enabled
      if (trigger.deleteOriginal) {
        await message.delete().catch(() => {});
      }

      // Send DM if enabled
      if (trigger.dmUser) {
        try {
          const dmContent = this.processVariables(trigger.response, message);
          await message.author.send(dmContent);
        } catch {
          // User has DMs disabled
        }
      }

    } catch (error) {
      logger.error('Auto-responder failed to send:', error);
    }
  }

  /**
   * Update usage statistics
   */
  private static async updateUsage(triggerId: string): Promise<void> {
    try {
      await prisma.autoResponder.update({
        where: { id: triggerId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Add new trigger
   */
  static async add(
    guildId: string,
    trigger: string,
    response: string,
    triggerType: TriggerType = TriggerType.CONTAINS,
    responseType: ResponseType = ResponseType.TEXT,
    cooldownSeconds: number = 0
  ): Promise<string> {
    const created = await prisma.autoResponder.create({
      data: {
        guildId,
        trigger,
        response,
        triggerType,
        responseType,
        cooldownSeconds,
      },
    });
    return created.id;
  }

  /**
   * Remove trigger by ID
   */
  static async remove(id: string): Promise<boolean> {
    try {
      await prisma.autoResponder.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Toggle trigger enabled state
   */
  static async toggle(id: string, enabled: boolean): Promise<void> {
    await prisma.autoResponder.update({
      where: { id },
      data: { enabled },
    });
  }

  /**
   * List all triggers for a guild
   */
  static async list(guildId: string) {
    return prisma.autoResponder.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get trigger type display name
   */
  static getTriggerTypeName(type: TriggerType): string {
    const names: Record<TriggerType, string> = {
      EXACT: 'Exact Match',
      CONTAINS: 'Contains',
      STARTS_WITH: 'Starts With',
      ENDS_WITH: 'Ends With',
      REGEX: 'Regex',
      WILDCARD: 'Wildcard',
    };
    return names[type] || type;
  }
}
