import {
  AttachmentBuilder,
  EmbedBuilder,
  GuildMember,
  TextChannel,
  PartialGuildMember,
} from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { parseTemplate, TemplateContext } from '../../lib/template.js';
import { generateWelcomeImage, generateGoodbyeImage } from './welcomeImage.js';
import { logger } from '../../utils/logger.js';

// Default templates
const DEFAULT_WELCOME = 'Welcome {{user}} to **{{server}}**! You are member #{{memberCount}}.';
const DEFAULT_GOODBYE = '**{{username}}** has left the server. We now have {{memberCount}} members.';

/**
 * Welcome/Goodbye message handler with template support
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

      // Get custom template if exists
      const template = await prisma.messageTemplate.findUnique({
        where: { guildId_name: { guildId: member.guild.id, name: 'welcome' } },
      });

      // Build template context
      const context: TemplateContext = {
        user: {
          id: member.id,
          username: member.user.username,
          displayName: member.displayName,
          tag: member.user.tag,
          avatar: member.user.displayAvatarURL({ size: 256 }),
          mention: `<@${member.id}>`,
        },
        guild: {
          id: member.guild.id,
          name: member.guild.name,
          icon: member.guild.iconURL() || undefined,
          memberCount: member.guild.memberCount,
        },
        member: {
          joinPosition: member.guild.memberCount,
          // TODO: Add invitedBy tracking
        },
      };

      // Parse template
      const templateContent = template?.enabled !== false
        ? (template?.content || settings.welcomeMessage || DEFAULT_WELCOME)
        : DEFAULT_WELCOME;

      const message = parseTemplate(templateContent, context);

      // Generate image if enabled
      const files: AttachmentBuilder[] = [];
      const imageUrl = template?.imageUrl || null;

      if (settings.welcomeImageEnabled) {
        try {
          const imageBuffer = await generateWelcomeImage(member);
          files.push(new AttachmentBuilder(imageBuffer, { name: 'welcome.png' }));
        } catch (error) {
          logger.error('Failed to generate welcome image:', error);
        }
      }

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(message)
        .setTimestamp();

      // Set thumbnail to user avatar
      embed.setThumbnail(member.user.displayAvatarURL({ size: 128 }));

      // Set image
      if (files.length > 0) {
        embed.setImage('attachment://welcome.png');
      } else if (imageUrl) {
        embed.setImage(imageUrl);
      }

      await (channel as TextChannel).send({ embeds: [embed], files });
      logger.info(`Welcome message sent for ${member.user.tag} in ${member.guild.name}`);
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

      // Get custom template if exists
      const template = await prisma.messageTemplate.findUnique({
        where: { guildId_name: { guildId: member.guild.id, name: 'goodbye' } },
      });

      // Build template context
      const context: TemplateContext = {
        user: {
          id: member.id,
          username: member.user?.username || 'Unknown',
          displayName: member.displayName || member.user?.username || 'Unknown',
          tag: member.user?.tag || 'Unknown#0000',
          avatar: member.user?.displayAvatarURL({ size: 256 }),
          mention: `<@${member.id}>`,
        },
        guild: {
          id: member.guild.id,
          name: member.guild.name,
          icon: member.guild.iconURL() || undefined,
          memberCount: member.guild.memberCount,
        },
      };

      // Parse template
      const templateContent = template?.enabled !== false
        ? (template?.content || settings.goodbyeMessage || DEFAULT_GOODBYE)
        : DEFAULT_GOODBYE;

      const message = parseTemplate(templateContent, context);

      const files: AttachmentBuilder[] = [];
      const imageUrl = template?.imageUrl || null;

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
      } else if (imageUrl) {
        embed.setImage(imageUrl);
      }

      await (channel as TextChannel).send({ embeds: [embed], files });
      logger.info(`Goodbye message sent for ${member.user?.tag || 'Unknown'} in ${member.guild.name}`);
    } catch (error) {
      logger.error('Failed to send goodbye message:', error);
    }
  }
}
