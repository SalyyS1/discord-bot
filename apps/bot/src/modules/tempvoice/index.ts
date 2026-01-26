import {
  Guild,
  VoiceChannel,
  CategoryChannel,
  ChannelType,
  PermissionFlagsBits,
  VoiceState,
} from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';
import { logger } from '../../utils/logger.js';

/**
 * Temporary voice channel module
 * Creates and manages join-to-create voice channels
 */
export class TempVoiceModule {
  /**
   * Setup temp voice system for a guild
   */
  static async setup(
    guild: Guild,
    creatorChannelId: string,
    categoryId: string,
    defaultName: string = "{user}'s Channel"
  ): Promise<void> {
    // Ensure guild exists first to prevent FK constraint violation
    await ensureGuild(guild.id, guild.name);

    await prisma.tempVoiceConfig.upsert({
      where: { guildId: guild.id },
      create: {
        guildId: guild.id,
        creatorChannelId,
        categoryId,
        defaultName,
      },
      update: {
        creatorChannelId,
        categoryId,
        defaultName,
      },
    });
  }

  /**
   * Handle voice state update
   */
  static async handleVoiceUpdate(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<void> {
    // User joined a channel
    if (newState.channel) {
      await this.handleJoinCreator(newState);
    }

    // User left a channel
    if (oldState.channel) {
      await this.handleLeaveChannel(oldState);
    }
  }

  /**
   * Create temp channel when user joins creator channel
   */
  private static async handleJoinCreator(state: VoiceState): Promise<void> {
    const config = await prisma.tempVoiceConfig.findUnique({
      where: { guildId: state.guild.id },
    });

    if (!config || state.channel?.id !== config.creatorChannelId) return;

    const member = state.member;
    if (!member) return;

    // Check if user already has a temp channel
    const existing = await prisma.tempVoiceChannel.findFirst({
      where: { guildId: state.guild.id, ownerId: member.id },
    });

    if (existing) {
      // Move user to their existing channel
      const channel = state.guild.channels.cache.get(existing.channelId);
      if (channel) {
        try {
          await member.voice.setChannel(channel as VoiceChannel);
        } catch {
          // Channel may have been deleted, clean up DB
          await prisma.tempVoiceChannel.delete({ where: { channelId: existing.channelId } });
        }
        return;
      }
    }

    // Get category
    const category = state.guild.channels.cache.get(
      config.categoryId
    ) as CategoryChannel;
    
    const channelName = config.defaultName.replace('{user}', member.displayName);

    try {
      // Create new temp channel
      const tempChannel = await state.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: category,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
            ],
          },
        ],
      });

      // Save to database
      await prisma.tempVoiceChannel.create({
        data: {
          channelId: tempChannel.id,
          guildId: state.guild.id,
          ownerId: member.id,
          name: channelName,
        },
      });

      // Move user to new channel
      await member.voice.setChannel(tempChannel);

      logger.info(`Created temp voice channel for ${member.user.tag}`);
    } catch (error) {
      logger.error('Failed to create temp voice channel:', error);
    }
  }

  /**
   * Cleanup empty temp channels
   */
  private static async handleLeaveChannel(state: VoiceState): Promise<void> {
    const channelId = state.channel?.id;
    if (!channelId) return;

    const tempChannel = await prisma.tempVoiceChannel.findUnique({
      where: { channelId },
    });

    if (!tempChannel) return;

    // Check if channel is empty
    const channel = state.guild.channels.cache.get(channelId) as VoiceChannel;
    if (!channel || channel.members.size > 0) return;

    // Delete empty channel
    try {
      await channel.delete('Temp voice channel empty');
      await prisma.tempVoiceChannel.delete({
        where: { channelId },
      });

      logger.info(`Deleted empty temp voice channel: ${channelId}`);
    } catch (error) {
      logger.error('Failed to delete temp voice channel:', error);
    }
  }

  /**
   * Get temp channel owner
   */
  static async getOwner(channelId: string): Promise<string | null> {
    const channel = await prisma.tempVoiceChannel.findUnique({
      where: { channelId },
    });
    return channel?.ownerId ?? null;
  }

  /**
   * Check if user is channel owner
   */
  static async isOwner(channelId: string, userId: string): Promise<boolean> {
    const ownerId = await this.getOwner(channelId);
    return ownerId === userId;
  }

  /**
   * Disable temp voice system
   */
  static async disable(guildId: string): Promise<void> {
    await prisma.tempVoiceConfig.delete({
      where: { guildId },
    }).catch(() => {});
  }
}
