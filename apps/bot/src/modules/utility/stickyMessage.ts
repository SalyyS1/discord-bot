import { TextChannel, EmbedBuilder, Message } from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

/**
 * Sticky messages that stay at the bottom of channels
 */
export class StickyMessageModule {
  /**
   * Create or update sticky message for a channel
   */
  static async setSticky(
    channel: TextChannel,
    content: string,
    embedJson?: object
  ): Promise<void> {
    // Delete existing sticky if any
    const existing = await prisma.stickyMessage.findUnique({
      where: { channelId: channel.id },
    });

    if (existing?.currentMessageId) {
      try {
        const oldMsg = await channel.messages.fetch(existing.currentMessageId);
        await oldMsg.delete();
      } catch {
        // Message already deleted
      }
    }

    // Send new sticky message
    let embed: EmbedBuilder | undefined;
    if (embedJson) {
      embed = EmbedBuilder.from(embedJson as any);
    }

    const msg = await channel.send({
      content: embed ? undefined : content,
      embeds: embed ? [embed] : [],
    });

    // Save to database
    await prisma.stickyMessage.upsert({
      where: { channelId: channel.id },
      create: {
        guildId: channel.guild.id,
        channelId: channel.id,
        currentMessageId: msg.id,
        content,
        embedJson: embedJson as any,
      },
      update: {
        currentMessageId: msg.id,
        content,
        embedJson: embedJson as any,
      },
    });
  }

  /**
   * Remove sticky message from channel
   */
  static async removeSticky(channel: TextChannel): Promise<boolean> {
    const sticky = await prisma.stickyMessage.findUnique({
      where: { channelId: channel.id },
    });

    if (!sticky) return false;

    if (sticky.currentMessageId) {
      try {
        const msg = await channel.messages.fetch(sticky.currentMessageId);
        await msg.delete();
      } catch {
        // Message already deleted
      }
    }

    await prisma.stickyMessage.delete({
      where: { channelId: channel.id },
    });

    return true;
  }

  /**
   * Re-send sticky message after new message in channel
   * Called from messageCreate event
   */
  static async restick(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const sticky = await prisma.stickyMessage.findUnique({
      where: { channelId: message.channel.id },
    });

    if (!sticky) return;

    // Don't restick if the last message IS the sticky
    if (sticky.currentMessageId === message.id) return;

    // Delete old sticky message
    if (sticky.currentMessageId) {
      try {
        const oldMsg = await message.channel.messages.fetch(
          sticky.currentMessageId
        );
        await oldMsg.delete();
      } catch {
        // Message already deleted
      }
    }

    // Send new sticky message
    let embed: EmbedBuilder | undefined;
    if (sticky.embedJson) {
      embed = EmbedBuilder.from(sticky.embedJson as any);
    }

    const channel = message.channel as TextChannel;
    try {
      const newMsg = await channel.send({
        content: embed ? undefined : sticky.content,
        embeds: embed ? [embed] : [],
      });

      // Update message ID in database
      await prisma.stickyMessage.update({
        where: { channelId: channel.id },
        data: { currentMessageId: newMsg.id },
      });
    } catch (error) {
      logger.error('Failed to restick message:', error);
    }
  }

  /**
   * Get sticky message for a channel
   */
  static async getSticky(
    channelId: string
  ): Promise<{ content: string; embedJson: object | null } | null> {
    const sticky = await prisma.stickyMessage.findUnique({
      where: { channelId },
      select: { content: true, embedJson: true },
    });
    return sticky
      ? { content: sticky.content, embedJson: sticky.embedJson as object | null }
      : null;
  }
}
