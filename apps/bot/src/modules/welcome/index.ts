import {
  AttachmentBuilder,
  EmbedBuilder,
  GuildMember,
  TextChannel,
  PartialGuildMember,
} from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { generateWelcomeImage, generateGoodbyeImage } from './welcomeImage.js';
import { logger } from '../../utils/logger.js';

/**
 * Welcome/Goodbye message handler
 */
export class WelcomeModule {
  /**
   * Send welcome message to configured channel
   */
  static async sendWelcome(member: GuildMember): Promise<void> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!settings?.welcomeChannelId) return;

    try {
      const channel = await member.guild.channels.fetch(settings.welcomeChannelId);
      if (!channel?.isTextBased()) return;

      // Build message with variable replacement
      const message = this.parseMessage(
        settings.welcomeMessage ??
          'Welcome {user} to **{server}**! You are member #{count}.',
        member
      );

      // Generate image if enabled
      const files: AttachmentBuilder[] = [];
      if (settings.welcomeImageEnabled) {
        try {
          const imageBuffer = await generateWelcomeImage(member);
          files.push(new AttachmentBuilder(imageBuffer, { name: 'welcome.png' }));
        } catch (error) {
          logger.error('Failed to generate welcome image:', error);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(message)
        .setTimestamp();

      if (files.length > 0) {
        embed.setImage('attachment://welcome.png');
      }

      await (channel as TextChannel).send({ embeds: [embed], files });
    } catch (error) {
      logger.error('Failed to send welcome message:', error);
    }
  }

  /**
   * Send goodbye message to configured channel
   */
  static async sendGoodbye(member: GuildMember | PartialGuildMember): Promise<void> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!settings?.goodbyeChannelId) return;

    try {
      const channel = await member.guild.channels.fetch(settings.goodbyeChannelId);
      if (!channel?.isTextBased()) return;

      const message = this.parseMessage(
        settings.goodbyeMessage ?? '**{username}** has left the server.',
        member
      );

      const files: AttachmentBuilder[] = [];
      if (settings.goodbyeImageEnabled) {
        try {
          // Only generate image if we have full member data
          if ('user' in member && member.user) {
            const imageBuffer = await generateGoodbyeImage(member as GuildMember);
            files.push(new AttachmentBuilder(imageBuffer, { name: 'goodbye.png' }));
          }
        } catch (error) {
          logger.error('Failed to generate goodbye image:', error);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(message)
        .setTimestamp();

      if (files.length > 0) {
        embed.setImage('attachment://goodbye.png');
      }

      await (channel as TextChannel).send({ embeds: [embed], files });
    } catch (error) {
      logger.error('Failed to send goodbye message:', error);
    }
  }

  /**
   * Parse message template with member variables
   */
  private static parseMessage(
    template: string,
    member: GuildMember | PartialGuildMember
  ): string {
    return template
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{username}/g, member.user?.username ?? 'Unknown')
      .replace(/{tag}/g, member.user?.tag ?? 'Unknown#0000')
      .replace(/{server}/g, member.guild.name)
      .replace(/{count}/g, member.guild.memberCount.toString());
  }
}
