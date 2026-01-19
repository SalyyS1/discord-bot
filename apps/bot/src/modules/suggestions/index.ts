import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  User,
} from 'discord.js';
import { prisma, SuggestionStatus } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

/**
 * Suggestions system with voting
 */
export class SuggestionsModule {
  /**
   * Create new suggestion
   */
  static async create(
    channel: TextChannel,
    author: User,
    content: string
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('💡 New Suggestion')
      .setDescription(content)
      .addFields(
        { name: 'Status', value: '⏳ Pending', inline: true },
        { name: 'Author', value: author.tag, inline: true },
        { name: 'Votes', value: '👍 0 | 👎 0', inline: true }
      )
      .setFooter({ text: 'ID: pending' })
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_upvote')
        .setLabel('0')
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('suggest_downvote')
        .setLabel('0')
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await channel.send({ embeds: [embed], components: [buttons] });

    // Save to database
    const suggestion = await prisma.suggestion.create({
      data: {
        guildId: channel.guild.id,
        messageId: msg.id,
        authorId: author.id,
        content,
      },
    });

    // Update footer with actual ID
    embed.setFooter({ text: `ID: ${suggestion.id.slice(0, 8)}` });
    await msg.edit({ embeds: [embed] });
  }

  /**
   * Handle vote button click
   */
  static async handleVote(
    interaction: ButtonInteraction,
    isUpvote: boolean
  ): Promise<void> {
    const suggestion = await prisma.suggestion.findUnique({
      where: { messageId: interaction.message.id },
    });

    if (!suggestion) {
      await interaction.reply({
        content: '❌ Suggestion not found.',
        ephemeral: true,
      });
      return;
    }

    // Update vote count
    const updateData = isUpvote
      ? { upvotes: { increment: 1 } }
      : { downvotes: { increment: 1 } };

    const updated = await prisma.suggestion.update({
      where: { id: suggestion.id },
      data: updateData,
    });

    // Update embed
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const voteFieldIndex = embed.data.fields?.findIndex(
      (f) => f.name === 'Votes'
    );
    
    if (voteFieldIndex !== undefined && voteFieldIndex >= 0) {
      embed.spliceFields(voteFieldIndex, 1, {
        name: 'Votes',
        value: `👍 ${updated.upvotes} | 👎 ${updated.downvotes}`,
        inline: true,
      });
    }

    // Update buttons with new counts
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_upvote')
        .setLabel(`${updated.upvotes}`)
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('suggest_downvote')
        .setLabel(`${updated.downvotes}`)
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({ embeds: [embed], components: [buttons] });
  }

  /**
   * Update suggestion status (for staff)
   */
  static async updateStatus(
    messageId: string,
    status: SuggestionStatus,
    staffNote?: string
  ): Promise<void> {
    await prisma.suggestion.update({
      where: { messageId },
      data: { status, staffNote },
    });
  }

  /**
   * Get status emoji for display
   */
  static getStatusEmoji(status: SuggestionStatus): string {
    const emojis: Record<SuggestionStatus, string> = {
      PENDING: '⏳',
      APPROVED: '✅',
      DENIED: '❌',
      IMPLEMENTED: '🎉',
    };
    return emojis[status] || '❓';
  }
}
