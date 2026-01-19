import {
  Guild,
  TextChannel,
  CategoryChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  ChannelType,
  PermissionFlagsBits,
  ButtonInteraction,
} from 'discord.js';
import { prisma, TicketStatus } from '../../lib/prisma.js';
import { TranscriptService } from './transcripts.js';
import { logger } from '../../utils/logger.js';

/**
 * Support ticket system module
 */
export class TicketModule {
  /**
   * Setup ticket panel in a channel
   */
  static async setupPanel(
    channel: TextChannel,
    categoryId: string,
    title: string = 'Support Tickets',
    description: string = 'Click the button below to create a ticket.'
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🎫 ${title}`)
      .setDescription(description)
      .setFooter({ text: 'Powered by Discord Bot' });

    const button = new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('Create Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎫');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });

    // Save category setting
    await prisma.guildSettings.upsert({
      where: { guildId: channel.guild.id },
      create: { guildId: channel.guild.id, ticketCategoryId: categoryId },
      update: { ticketCategoryId: categoryId },
    });
  }

  /**
   * Create new ticket
   */
  static async create(
    guild: Guild,
    member: GuildMember,
    category?: string
  ): Promise<TextChannel | null> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings?.ticketCategoryId) return null;

    // Get or create member record
    const dbMember = await prisma.member.upsert({
      where: {
        discordId_guildId: { discordId: member.id, guildId: guild.id },
      },
      create: { discordId: member.id, guildId: guild.id },
      update: {},
    });

    // Check for existing open ticket
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        guildId: guild.id,
        memberId: dbMember.id,
        status: { in: [TicketStatus.OPEN, TicketStatus.CLAIMED] },
      },
    });

    if (existingTicket) {
      return null; // User already has open ticket
    }

    // Get ticket category
    const ticketCategory = guild.channels.cache.get(
      settings.ticketCategoryId
    ) as CategoryChannel;

    // Generate ticket number
    const ticketCount = await prisma.ticket.count({ where: { guildId: guild.id } });

    // Create ticket channel
    const channel = await guild.channels.create({
      name: `ticket-${ticketCount + 1}`,
      type: ChannelType.GuildText,
      parent: ticketCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });

    // Save ticket to database
    const ticket = await prisma.ticket.create({
      data: {
        guildId: guild.id,
        memberId: dbMember.id,
        channelId: channel.id,
        category: category ?? 'general',
      },
    });

    // Send welcome message
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎫 Ticket Created')
      .setDescription(
        `Hello ${member}, thank you for creating a ticket.\n` +
          'A staff member will be with you shortly.\n\n' +
          'Please describe your issue below.'
      )
      .setFooter({ text: `Ticket ID: ${ticket.id.slice(0, 8)}` })
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✋'),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await channel.send({
      content: `${member}`,
      embeds: [embed],
      components: [buttons],
    });

    logger.info(`Ticket created for ${member.user.tag}: ${channel.name}`);
    return channel;
  }

  /**
   * Handle ticket create button
   */
  static async handleCreate(interaction: ButtonInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    
    await interaction.deferReply({ ephemeral: true });
    
    const channel = await this.create(interaction.guild!, member);
    
    if (!channel) {
      await interaction.editReply(
        '❌ You already have an open ticket, or tickets are not configured.'
      );
      return;
    }

    await interaction.editReply(`✅ Ticket created! <#${channel.id}>`);
  }

  /**
   * Claim ticket
   */
  static async claim(
    interaction: ButtonInteraction,
    staffMember: GuildMember
  ): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: interaction.channel!.id },
    });

    if (!ticket) {
      await interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      return;
    }

    if (ticket.status !== TicketStatus.OPEN) {
      await interaction.reply({
        content: '❌ This ticket has already been claimed.',
        ephemeral: true,
      });
      return;
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CLAIMED,
        claimedBy: staffMember.id,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(`✋ ${staffMember} has claimed this ticket.`);

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Close ticket
   */
  static async close(
    channel: TextChannel,
    closedBy: GuildMember
  ): Promise<string | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: channel.id },
      include: { member: true },
    });

    if (!ticket) return null;

    // Generate transcript
    let transcriptUrl: string | null = null;
    try {
      transcriptUrl = await TranscriptService.generate(channel, ticket.id);
    } catch (error) {
      logger.error('Failed to generate transcript:', error);
    }

    // Update ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CLOSED,
        closedBy: closedBy.id,
        closedAt: new Date(),
        transcriptUrl,
      },
    });

    // Send closing message
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🔒 Ticket Closed')
      .setDescription(
        `Ticket closed by ${closedBy}.\n` +
          (transcriptUrl
            ? `Transcript: ${transcriptUrl}\n\n`
            : 'Transcript: Not available\n\n') +
          'This channel will be deleted in 5 seconds.'
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed');
      } catch (error) {
        logger.error('Failed to delete ticket channel:', error);
      }
    }, 5000);

    logger.info(`Ticket ${ticket.id} closed by ${closedBy.user.tag}`);
    return transcriptUrl;
  }

  /**
   * Add user to ticket
   */
  static async addUser(channel: TextChannel, member: GuildMember): Promise<void> {
    await channel.permissionOverwrites.edit(member, {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: true,
      ReadMessageHistory: true,
    });
  }

  /**
   * Remove user from ticket
   */
  static async removeUser(channel: TextChannel, member: GuildMember): Promise<void> {
    await channel.permissionOverwrites.delete(member);
  }
}
