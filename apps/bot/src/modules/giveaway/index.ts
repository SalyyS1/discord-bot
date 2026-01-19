import {
  Guild,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
  Message,
} from 'discord.js';
import { prisma, GiveawayStatus } from '../../lib/prisma.js';
import { giveawayQueue } from '../../lib/queue.js';
import { GiveawayRequirements } from './requirements.js';
import { GiveawaySelector } from './selector.js';
import { logger } from '../../utils/logger.js';
import { client } from '../../lib/client.js';

interface CreateGiveawayOptions {
  channelId: string;
  hostId: string;
  prize: string;
  prizeSecret?: string;
  winnerCount: number;
  duration: number; // milliseconds
  requiredRoleIds?: string[];
  requiredInvites?: number;
  requiredLevel?: number;
  requiredReputation?: number;
}

/**
 * Giveaway system module
 */
export class GiveawayModule {
  /**
   * Create a new giveaway
   */
  static async create(
    guild: Guild,
    options: CreateGiveawayOptions
  ): Promise<string | null> {
    const channel = await guild.channels.fetch(options.channelId);
    if (!channel?.isTextBased()) return null;

    const endsAt = new Date(Date.now() + options.duration);

    // Create embed
    const embed = this.buildEmbed({
      prize: options.prize,
      hostId: options.hostId,
      winnerCount: options.winnerCount,
      endsAt,
      entries: 0,
      requiredRoleIds: options.requiredRoleIds ?? [],
      requiredInvites: options.requiredInvites ?? 0,
      requiredLevel: options.requiredLevel ?? 0,
      requiredReputation: options.requiredReputation ?? 0,
    });

    const button = new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel('Enter (0)')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎉');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const msg = await (channel as TextChannel).send({
      embeds: [embed],
      components: [row],
    });

    // Save to database
    const giveaway = await prisma.giveaway.create({
      data: {
        guildId: guild.id,
        channelId: options.channelId,
        messageId: msg.id,
        hostId: options.hostId,
        prize: options.prize,
        prizeSecret: options.prizeSecret,
        winnerCount: options.winnerCount,
        endsAt,
        requiredRoleIds: options.requiredRoleIds ?? [],
        requiredInvites: options.requiredInvites ?? 0,
        requiredLevel: options.requiredLevel ?? 0,
        requiredReputation: options.requiredReputation ?? 0,
      },
    });

    // Schedule end job
    await giveawayQueue.add(
      'end',
      { giveawayId: giveaway.id },
      { delay: options.duration }
    );

    logger.info(`Giveaway created: ${giveaway.id}`);
    return giveaway.id;
  }

  /**
   * Handle entry button click
   */
  static async handleEntry(interaction: ButtonInteraction): Promise<void> {
    const giveaway = await prisma.giveaway.findFirst({
      where: { messageId: interaction.message.id },
    });

    if (!giveaway) {
      await interaction.reply({
        content: '❌ Giveaway not found.',
        ephemeral: true,
      });
      return;
    }

    if (giveaway.status !== GiveawayStatus.ACTIVE) {
      await interaction.reply({
        content: '❌ This giveaway has ended.',
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member as GuildMember;

    // Check blacklist
    const isBlacklisted = await GiveawaySelector.isBlacklisted(
      giveaway.guildId,
      member.id
    );

    if (isBlacklisted) {
      await interaction.reply({
        content: '❌ You are blacklisted from giveaways.',
        ephemeral: true,
      });
      return;
    }

    // Check requirements
    const requirementCheck = await GiveawayRequirements.check(member, {
      roleIds: giveaway.requiredRoleIds,
      minInvites: giveaway.requiredInvites,
      minLevel: giveaway.requiredLevel,
      minReputation: giveaway.requiredReputation,
    });

    if (!requirementCheck.eligible) {
      await interaction.reply({
        content: `❌ You don't meet the requirements:\n• ${requirementCheck.missing.join('\n• ')}`,
        ephemeral: true,
      });
      return;
    }

    // Get or create member record
    const dbMember = await prisma.member.upsert({
      where: {
        discordId_guildId: { discordId: member.id, guildId: giveaway.guildId },
      },
      create: { discordId: member.id, guildId: giveaway.guildId },
      update: {},
    });

    // Check if already entered
    const existingEntry = await prisma.giveawayEntry.findUnique({
      where: {
        giveawayId_memberId: {
          giveawayId: giveaway.id,
          memberId: dbMember.id,
        },
      },
    });

    if (existingEntry) {
      await interaction.reply({
        content: '✅ You have already entered this giveaway!',
        ephemeral: true,
      });
      return;
    }

    // Create entry
    await prisma.giveawayEntry.create({
      data: {
        giveawayId: giveaway.id,
        memberId: dbMember.id,
      },
    });

    // Update entry count on message
    const entryCount = await prisma.giveawayEntry.count({
      where: { giveawayId: giveaway.id },
    });

    await this.updateEmbed(interaction.message as Message, entryCount);

    await interaction.reply({
      content: `🎉 You have entered the giveaway for **${giveaway.prize}**!`,
      ephemeral: true,
    });
  }

  /**
   * End giveaway and select winners
   */
  static async end(giveawayId: string): Promise<string[]> {
    const giveaway = await prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway || giveaway.status !== GiveawayStatus.ACTIVE) return [];

    // Select winners
    const winnerIds = await GiveawaySelector.selectWinners(
      giveawayId,
      giveaway.winnerCount
    );

    // Save winners
    for (const winnerId of winnerIds) {
      await prisma.giveawayWinner.create({
        data: {
          giveawayId,
          userId: winnerId,
        },
      });
    }

    // Update giveaway status
    await prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        status: GiveawayStatus.ENDED,
        endedAt: new Date(),
      },
    });

    // Update message (only if messageId exists)
    if (giveaway.messageId) {
      await this.updateEndedEmbed(
        {
          guildId: giveaway.guildId,
          channelId: giveaway.channelId,
          messageId: giveaway.messageId,
          prize: giveaway.prize,
        },
        winnerIds
      );
    }

    // DM winners
    await this.notifyWinners(giveaway, winnerIds);

    logger.info(`Giveaway ${giveawayId} ended with ${winnerIds.length} winners`);
    return winnerIds;
  }

  /**
   * Force end a giveaway by message ID
   */
  static async forceEnd(messageId: string): Promise<string[]> {
    const giveaway = await prisma.giveaway.findFirst({
      where: { messageId },
    });

    if (!giveaway) return [];
    return this.end(giveaway.id);
  }

  /**
   * Reroll winner(s)
   */
  static async reroll(
    messageId: string,
    count: number = 1
  ): Promise<string[]> {
    const giveaway = await prisma.giveaway.findFirst({
      where: { messageId },
    });

    if (!giveaway || giveaway.status !== GiveawayStatus.ENDED) return [];

    // Get existing winners to exclude
    const existingWinners = await prisma.giveawayWinner.findMany({
      where: { giveawayId: giveaway.id },
    });

    const excludeIds = existingWinners.map((w) => w.userId);

    // Select new winners
    const newWinnerIds = await GiveawaySelector.selectWinners(
      giveaway.id,
      count,
      excludeIds
    );

    // Add new winners
    for (const winnerId of newWinnerIds) {
      await prisma.giveawayWinner.create({
        data: {
          giveawayId: giveaway.id,
          userId: winnerId,
        },
      });
    }

    // Notify new winners
    await this.notifyWinners(giveaway, newWinnerIds);

    return newWinnerIds;
  }

  /**
   * List active giveaways for a guild
   */
  static async listActive(guildId: string) {
    return prisma.giveaway.findMany({
      where: {
        guildId,
        status: GiveawayStatus.ACTIVE,
      },
      orderBy: { endsAt: 'asc' },
    });
  }

  /**
   * Build giveaway embed
   */
  private static buildEmbed(data: {
    prize: string;
    hostId: string;
    winnerCount: number;
    endsAt: Date;
    entries: number;
    requiredRoleIds: string[];
    requiredInvites: number;
    requiredLevel: number;
    requiredReputation: number;
  }): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(`**${data.prize}**`)
      .addFields(
        { name: 'Host', value: `<@${data.hostId}>`, inline: true },
        { name: 'Winners', value: `${data.winnerCount}`, inline: true },
        { name: 'Entries', value: `${data.entries}`, inline: true },
        {
          name: 'Requirements',
          value: GiveawayRequirements.formatRequirements(
            data.requiredRoleIds,
            data.requiredInvites,
            data.requiredLevel,
            data.requiredReputation
          ),
        }
      )
      .setFooter({ text: 'Ends' })
      .setTimestamp(data.endsAt);

    return embed;
  }

  /**
   * Update embed entry count
   */
  private static async updateEmbed(
    message: Message,
    entryCount: number
  ): Promise<void> {
    try {
      const embed = EmbedBuilder.from(message.embeds[0]);
      embed.spliceFields(2, 1, {
        name: 'Entries',
        value: `${entryCount}`,
        inline: true,
      });

      const button = new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel(`Enter (${entryCount})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎉');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await message.edit({ embeds: [embed], components: [row] });
    } catch (error) {
      logger.error('Failed to update giveaway embed:', error);
    }
  }

  /**
   * Update embed when giveaway ends
   */
  private static async updateEndedEmbed(
    giveaway: { guildId: string; channelId: string; messageId: string; prize: string },
    winnerIds: string[]
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(giveaway.guildId);
      const channel = await guild.channels.fetch(giveaway.channelId) as TextChannel;
      const message = await channel.messages.fetch(giveaway.messageId);

      const winnerMentions = winnerIds.length > 0
        ? winnerIds.map((id) => `<@${id}>`).join(', ')
        : 'No winners';

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎉 GIVEAWAY ENDED 🎉')
        .setDescription(`**${giveaway.prize}**`)
        .addFields({ name: 'Winners', value: winnerMentions })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId('giveaway_ended')
        .setLabel('Ended')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await message.edit({ embeds: [embed], components: [row] });

      // Also send announcement
      await channel.send({
        content: `🎊 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
      });
    } catch (error) {
      logger.error('Failed to update ended giveaway embed:', error);
    }
  }

  /**
   * Notify winners via DM
   */
  private static async notifyWinners(
    giveaway: { prize: string; prizeSecret?: string | null },
    winnerIds: string[]
  ): Promise<void> {
    const prize = giveaway.prizeSecret ?? giveaway.prize;

    for (const winnerId of winnerIds) {
      try {
        const user = await client.users.fetch(winnerId);
        await user.send(
          `🎉 **Congratulations!** You won the giveaway!\n\n` +
            `**Prize:** ${prize}\n\n` +
            `Please contact the giveaway host for your prize.`
        );
        logger.info(`Notified winner ${winnerId}`);
      } catch (error) {
        logger.error(`Failed to notify winner ${winnerId}:`, error);
      }
    }
  }
}
