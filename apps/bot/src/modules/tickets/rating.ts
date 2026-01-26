/**
 * Rating Service - Enhanced with MessageBuilder
 * Handles ticket ratings, reviews, and review channel publishing
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  TextChannel,
  Client,
  Message,
} from 'discord.js';
import { prisma, Ticket, TicketRating } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { compileMessage } from '@repo/config';
import type { MessageConfig, TemplateContext } from '@repo/types';
import { getGuildSettings } from '../../lib/settings.js';

// ═══════════════════════════════════════════════
// Default Configurations
// ═══════════════════════════════════════════════

function getDefaultRatingPromptConfig(): MessageConfig {
  return {
    version: 2,
    content: '',
    embeds: [{
      title: '⭐ Rate Your Support Experience',
      description: 'Your ticket in **{{guild.name}}** has been closed.\n\nPlease take a moment to rate the support you received. Your feedback helps us improve!',
      color: 0xFEE75C,
      fields: [
        { name: 'Ticket', value: '`#{{ticket.number}}`', inline: true },
        { name: 'Handled By', value: '{{staff.mention}}', inline: true },
      ],
      footer: { text: 'Click a button below to submit your rating' },
    }],
    components: [],
  };
}

function getDefaultReviewEmbedConfig(): MessageConfig {
  return {
    version: 2,
    content: '',
    embeds: [{
      title: '{{rating.stars}} Star Review',
      description: '{{rating.review}}',
      color: 0x22C55E, // Will be overridden based on stars
      fields: [
        { name: 'Staff Member', value: '{{staff.mention}}', inline: true },
      ],
      footer: { text: 'Ticket #{{ticket.number}}' },
      timestamp: true,
    }],
    components: [],
  };
}

// ═══════════════════════════════════════════════
// Rating Service
// ═══════════════════════════════════════════════

export class RatingService {
  private static client: Client;

  static init(client: Client): void {
    this.client = client;
  }

  /**
   * Request rating from user via DM
   */
  static async requestRating(
    ticket: Ticket & { member: { discordId: string } },
    member: GuildMember,
    staffId?: string | null
  ): Promise<void> {
    try {
      // Get guild settings for custom prompt
      const settings = await getGuildSettings(ticket.guildId);
      if (!settings?.ratingEnabled) {
        logger.debug(`Rating disabled for guild ${ticket.guildId}`);
        return;
      }

      // Get custom template or use default
      const config = (settings.ratingPromptConfig as unknown as MessageConfig) ?? getDefaultRatingPromptConfig();

      // Fetch staff member info if available
      let staffMention = 'Support Team';
      let staffName = 'Support Team';
      if (staffId) {
        try {
          const staffMember = await member.guild.members.fetch(staffId);
          staffMention = `<@${staffId}>`;
          staffName = staffMember.displayName;
        } catch {
          // Staff may have left
        }
      }

      // Build template context
      const context: TemplateContext = {
        user: {
          id: member.id,
          username: member.user.username,
          displayName: member.displayName,
          avatarUrl: member.user.displayAvatarURL(),
          mention: `<@${member.id}>`,
          createdAt: member.user.createdAt,
        },
        guild: {
          id: member.guild.id,
          name: member.guild.name,
          iconUrl: member.guild.iconURL() ?? undefined,
          memberCount: member.guild.memberCount,
          createdAt: member.guild.createdAt,
        },
        custom: {
          'ticket.number': ticket.id.slice(0, 8),
          'ticket.id': ticket.id,
          'staff.mention': staffMention,
          'staff.name': staffName,
        },
        timestamp: new Date(),
      };

      // Compile message
      const compiled = compileMessage(config, context);

      // Build rating buttons
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`rate_${ticket.id}_1`)
          .setLabel('1')
          .setEmoji('😞')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`rate_${ticket.id}_2`)
          .setLabel('2')
          .setEmoji('😕')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`rate_${ticket.id}_3`)
          .setLabel('3')
          .setEmoji('😐')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`rate_${ticket.id}_4`)
          .setLabel('4')
          .setEmoji('😊')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rate_${ticket.id}_5`)
          .setLabel('5')
          .setEmoji('🤩')
          .setStyle(ButtonStyle.Success),
      );

      await member.send({
        content: compiled.content || undefined,
        embeds: compiled.embeds.map(e => EmbedBuilder.from(e)),
        components: [row],
      });

      logger.info(`Requested rating from ${member.user.tag} for ticket ${ticket.id}`);
    } catch (error) {
      logger.warn(`Could not DM rating request to ${member.user.tag}:`, error);
    }
  }

  /**
   * Handle rating button click
   */
  static async handleRating(interaction: ButtonInteraction): Promise<void> {
    const [, ticketId, starsStr] = interaction.customId.split('_');
    const stars = parseInt(starsStr, 10);

    if (isNaN(stars) || stars < 1 || stars > 5) return;

    await interaction.deferReply({ ephemeral: true });

    try {
      // Get ticket with guild info
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { guild: true },
      });

      if (!ticket) {
        await interaction.editReply('This ticket no longer exists.');
        return;
      }

      // Get settings for auto-approve
      const settings = await getGuildSettings(ticket.guildId);
      const minStarsForReview = settings?.ratingMinStarsForReview ?? 4;
      const autoApprove = settings?.ratingAutoApprove ?? false;

      // Save rating with staff attribution
      const rating = await prisma.ticketRating.upsert({
        where: { ticketId },
        create: {
          ticketId,
          stars,
          staffId: ticket.claimedBy,
          approved: autoApprove && stars >= minStarsForReview,
        },
        update: {
          stars,
          staffId: ticket.claimedBy,
          approved: autoApprove && stars >= minStarsForReview,
        },
      });

      // Disable original buttons
      try {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...[1, 2, 3, 4, 5].map(n =>
            new ButtonBuilder()
              .setCustomId(`rate_${ticketId}_${n}`)
              .setLabel(n.toString())
              .setEmoji(n === stars ? '⭐' : n < stars ? '⭐' : '☆')
              .setStyle(n === stars ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(true)
          )
        );
        await interaction.message.edit({ components: [disabledRow] });
      } catch {
        // DM message may be deleted
      }

      // Prompt for review if high rating
      if (stars >= minStarsForReview) {
        const embed = new EmbedBuilder()
          .setColor(0x22C55E)
          .setDescription(`Thank you for rating us **${stars} stars**! ⭐\n\nWould you like to leave a written review?`);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`review_${ticketId}`)
            .setLabel('Write a Review')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝'),
          new ButtonBuilder()
            .setCustomId(`review_skip_${ticketId}`)
            .setLabel('No Thanks')
            .setStyle(ButtonStyle.Secondary),
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        // Just thank them
        const embed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setDescription(
            `Thank you for your feedback! We're sorry your experience wasn't perfect.\n\n` +
            `We'll work on improving our support.`
          );

        await interaction.editReply({ embeds: [embed] });

        // Still publish to review channel if enabled (for transparency)
        await this.publishReview(rating, ticket);
      }
    } catch (error) {
      logger.error('Error handling rating:', error);
      await interaction.editReply('An error occurred while saving your rating.');
    }
  }

  /**
   * Handle review skip button
   */
  static async handleReviewSkip(interaction: ButtonInteraction): Promise<void> {
    const ticketId = interaction.customId.replace('review_skip_', '');

    try {
      const rating = await prisma.ticketRating.findUnique({
        where: { ticketId },
        include: { ticket: true },
      });

      if (rating && rating.ticket) {
        await this.publishReview(rating, rating.ticket);
      }

      const embed = new EmbedBuilder()
        .setColor(0x22C55E)
        .setDescription('Thank you for your rating! Your feedback has been recorded.');

      await interaction.update({ embeds: [embed], components: [] });
    } catch (error) {
      logger.error('Error handling review skip:', error);
    }
  }

  /**
   * Handle review button (show modal)
   */
  static async handleReviewButton(interaction: ButtonInteraction): Promise<void> {
    const ticketId = interaction.customId.replace('review_', '');

    const modal = new ModalBuilder()
      .setCustomId(`review_modal_${ticketId}`)
      .setTitle('Leave a Review');

    const input = new TextInputBuilder()
      .setCustomId('review_text')
      .setLabel('Your Feedback')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tell us about your experience with our support team...')
      .setMinLength(10)
      .setMaxLength(500)
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  /**
   * Handle review modal submission
   */
  static async handleReviewModal(interaction: ModalSubmitInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const ticketId = interaction.customId.replace('review_modal_', '');
    const review = interaction.fields.getTextInputValue('review_text');

    try {
      // Update rating with review
      const rating = await prisma.ticketRating.update({
        where: { ticketId },
        data: { review },
        include: { ticket: true },
      });

      // Publish to review channel
      if (rating.ticket) {
        await this.publishReview(rating, rating.ticket);
      }

      await interaction.editReply('✅ Thank you for your review! We appreciate your feedback.');
    } catch (error) {
      logger.error('Error saving review:', error);
      await interaction.editReply('An error occurred while saving your review.');
    }
  }

  /**
   * Publish review to the configured review channel
   */
  static async publishReview(
    rating: TicketRating,
    ticket: Ticket
  ): Promise<Message | null> {
    try {
      // Get settings
      const settings = await getGuildSettings(ticket.guildId);
      if (!settings?.ratingChannelId) {
        logger.debug(`No review channel configured for guild ${ticket.guildId}`);
        return null;
      }

      // Fetch the channel
      const channel = await this.client.channels.fetch(settings.ratingChannelId);
      if (!channel || !(channel instanceof TextChannel)) {
        logger.warn(`Review channel ${settings.ratingChannelId} not found or not a text channel`);
        return null;
      }

      // Get guild for context
      const guild = await this.client.guilds.fetch(ticket.guildId);

      // Fetch staff member info if available
      let staffMention = 'Support Team';
      let staffName = 'Support Team';
      if (rating.staffId) {
        try {
          const staffMember = await guild.members.fetch(rating.staffId);
          staffMention = `<@${rating.staffId}>`;
          staffName = staffMember.displayName;
        } catch {
          staffMention = `<@${rating.staffId}>`;
        }
      }

      // Get custom template or use default
      const config = (settings.ratingReviewConfig as unknown as MessageConfig) ?? getDefaultReviewEmbedConfig();

      // Build template context
      const context: TemplateContext = {
        guild: {
          id: guild.id,
          name: guild.name,
          iconUrl: guild.iconURL() ?? undefined,
          memberCount: guild.memberCount,
          createdAt: guild.createdAt,
        },
        custom: {
          'ticket.number': ticket.id.slice(0, 8),
          'ticket.id': ticket.id,
          'rating.stars': '⭐'.repeat(rating.stars),
          'rating.value': rating.stars.toString(),
          'rating.review': rating.review || '_No written review provided._',
          'staff.mention': staffMention,
          'staff.name': staffName,
        },
        timestamp: new Date(),
      };

      // Compile message
      const compiled = compileMessage(config, context);

      // Override color based on rating
      const embeds = compiled.embeds.map(e => {
        const embed = EmbedBuilder.from(e);
        // Set color based on stars
        if (rating.stars >= 4) {
          embed.setColor(0x22C55E); // Green
        } else if (rating.stars >= 3) {
          embed.setColor(0xF59E0B); // Yellow/Orange
        } else {
          embed.setColor(0xEF4444); // Red
        }
        return embed;
      });

      // Send to review channel
      const message = await channel.send({
        content: compiled.content || undefined,
        embeds,
      });

      // Update rating with message ID
      await prisma.ticketRating.update({
        where: { id: rating.id },
        data: { reviewMessageId: message.id },
      });

      logger.info(`Published review for ticket ${ticket.id} to channel ${channel.id}`);
      return message;
    } catch (error) {
      logger.error('Error publishing review:', error);
      return null;
    }
  }

  /**
   * Get rating statistics for a guild
   */
  static async getGuildStats(guildId: string): Promise<{
    total: number;
    average: number;
    distribution: Record<number, number>;
    staffStats: Array<{
      staffId: string;
      ticketCount: number;
      avgRating: number;
    }>;
  }> {
    const ratings = await prisma.ticketRating.findMany({
      where: {
        ticket: { guildId },
      },
      select: {
        stars: true,
        staffId: true,
      },
    });

    // Calculate distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalStars = 0;

    for (const r of ratings) {
      distribution[r.stars]++;
      totalStars += r.stars;
    }

    // Calculate staff stats
    const staffMap = new Map<string, { total: number; count: number }>();
    for (const r of ratings) {
      if (r.staffId) {
        const current = staffMap.get(r.staffId) || { total: 0, count: 0 };
        current.total += r.stars;
        current.count++;
        staffMap.set(r.staffId, current);
      }
    }

    const staffStats = Array.from(staffMap.entries())
      .map(([staffId, { total, count }]) => ({
        staffId,
        ticketCount: count,
        avgRating: total / count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    return {
      total: ratings.length,
      average: ratings.length > 0 ? totalStars / ratings.length : 0,
      distribution,
      staffStats,
    };
  }
}
