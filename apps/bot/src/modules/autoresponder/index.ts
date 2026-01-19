import { Message, EmbedBuilder } from 'discord.js';
import { prisma, TriggerType, ResponseType } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../utils/logger.js';

/**
 * Keyword-based auto-responder module
 */
export class AutoResponderModule {
  /**
   * Check message for triggers and respond
   */
  static async check(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const triggers = await prisma.autoResponder.findMany({
      where: { guildId: message.guild.id, enabled: true },
    });

    for (const trigger of triggers) {
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

        // Send response
        await this.sendResponse(message, trigger.response, trigger.responseType);
        return true;
      }
    }

    return false;
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
      default:
        return false;
    }
  }

  /**
   * Send auto-response
   */
  private static async sendResponse(
    message: Message,
    response: string,
    type: ResponseType
  ): Promise<void> {
    try {
      // Check if channel supports sending messages
      if (!('send' in message.channel)) return;

      switch (type) {
        case ResponseType.TEXT:
          await message.channel.send(response);
          break;
        case ResponseType.EMBED: {
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(response);
          await message.channel.send({ embeds: [embed] });
          break;
        }
        case ResponseType.REACTION:
          await message.react(response);
          break;
      }
    } catch (error) {
      logger.error('Auto-responder failed to send:', error);
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
    };
    return names[type] || type;
  }
}
