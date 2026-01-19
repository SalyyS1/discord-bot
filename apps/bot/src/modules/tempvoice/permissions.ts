import { VoiceChannel, GuildMember } from 'discord.js';
import { prisma } from '../../lib/prisma.js';

/**
 * Temp voice channel permission management
 */
export class TempVoicePermissions {
  /**
   * Lock channel (only owner and permitted users can join)
   */
  static async lock(channel: VoiceChannel): Promise<void> {
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      Connect: false,
    });

    await prisma.tempVoiceChannel.update({
      where: { channelId: channel.id },
      data: { locked: true },
    });
  }

  /**
   * Unlock channel
   */
  static async unlock(channel: VoiceChannel): Promise<void> {
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      Connect: null, // Remove override, inherit from parent
    });

    await prisma.tempVoiceChannel.update({
      where: { channelId: channel.id },
      data: { locked: false },
    });
  }

  /**
   * Rename channel
   */
  static async rename(channel: VoiceChannel, name: string): Promise<void> {
    await channel.setName(name);

    await prisma.tempVoiceChannel.update({
      where: { channelId: channel.id },
      data: { name },
    });
  }

  /**
   * Set user limit
   */
  static async setLimit(channel: VoiceChannel, limit: number): Promise<void> {
    await channel.setUserLimit(limit);

    await prisma.tempVoiceChannel.update({
      where: { channelId: channel.id },
      data: { userLimit: limit },
    });
  }

  /**
   * Permit user to join
   */
  static async permit(channel: VoiceChannel, member: GuildMember): Promise<void> {
    await channel.permissionOverwrites.edit(member, {
      Connect: true,
    });
  }

  /**
   * Reject user from joining (and disconnect if present)
   */
  static async reject(channel: VoiceChannel, member: GuildMember): Promise<void> {
    await channel.permissionOverwrites.edit(member, {
      Connect: false,
    });

    // Disconnect if currently in channel
    if (member.voice.channelId === channel.id) {
      await member.voice.disconnect('Rejected from temp voice channel');
    }
  }

  /**
   * Transfer ownership to another member
   */
  static async transfer(
    channel: VoiceChannel,
    newOwner: GuildMember
  ): Promise<void> {
    const tempChannel = await prisma.tempVoiceChannel.findUnique({
      where: { channelId: channel.id },
    });

    if (!tempChannel) return;

    // Remove old owner permissions
    await channel.permissionOverwrites.delete(tempChannel.ownerId);

    // Add new owner permissions
    await channel.permissionOverwrites.edit(newOwner, {
      Connect: true,
      ManageChannels: true,
      MuteMembers: true,
      DeafenMembers: true,
      MoveMembers: true,
    });

    // Update database
    await prisma.tempVoiceChannel.update({
      where: { channelId: channel.id },
      data: { ownerId: newOwner.id },
    });
  }
}
