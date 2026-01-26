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
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ColorResolvable,
} from 'discord.js';
import { prisma, TicketStatus } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';
import { TranscriptService } from './transcripts.js';
import { RatingService } from './rating.js';
import { logger } from '../../utils/logger.js';

interface FormQuestion {
  id: string;
  label: string;
  type: 'short' | 'paragraph' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

/**
 * Ticket System V2 - Category-based with custom forms
 */
export class TicketV2Module {
  /**
   * Handle category button click (ticket_category:{categoryId})
   */
  static async handleCategoryButton(interaction: ButtonInteraction): Promise<void> {
    const categoryId = interaction.customId.replace('ticket_category:', '');
    await this.processTicketCreation(interaction, categoryId);
  }

  /**
   * Handle category select menu (ticket_category_select)
   */
  static async handleCategorySelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const categoryId = interaction.values[0];
    await this.processTicketCreation(interaction, categoryId);
  }

  /**
   * Process ticket creation - show form or create directly
   */
  private static async processTicketCreation(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    categoryId: string
  ): Promise<void> {
    const guildId = interaction.guildId!;
    const member = interaction.member as GuildMember;

    // Fetch category with panel info
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
      include: { panel: true },
    });

    if (!category || !category.enabled) {
      await interaction.reply({
        content: '❌ This ticket category is not available.',
        ephemeral: true,
      });
      return;
    }

    // Check for existing open tickets
    const dbMember = await prisma.member.findUnique({
      where: { discordId_guildId: { discordId: member.id, guildId } },
    });

    if (dbMember) {
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          guildId,
          memberId: dbMember.id,
          status: { in: [TicketStatus.OPEN, TicketStatus.CLAIMED] },
        },
      });

      if (existingTicket) {
        await interaction.reply({
          content: `❌ You already have an open ticket: <#${existingTicket.channelId}>`,
          ephemeral: true,
        });
        return;
      }
    }

    // Check if custom form is enabled
    const formQuestions = (category.formQuestions as FormQuestion[] | null) || [];
    if (category.formEnabled && formQuestions.length > 0) {
      // Show custom form modal
      await this.showFormModal(interaction, category.id, category.name, formQuestions);
    } else {
      // Create ticket directly
      await interaction.deferReply({ ephemeral: true });
      const channel = await this.createTicket(interaction.guild!, member, categoryId, {});
      
      if (channel) {
        await interaction.editReply(`✅ Ticket created! <#${channel.id}>`);
      } else {
        await interaction.editReply('❌ Failed to create ticket. Please contact an administrator.');
      }
    }
  }

  /**
   * Show custom form modal
   */
  private static async showFormModal(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    categoryId: string,
    categoryName: string,
    questions: FormQuestion[]
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(`ticket_form_${categoryId}`)
      .setTitle(`Create Ticket - ${categoryName.slice(0, 30)}`);

    // Discord modals support max 5 text inputs
    const maxQuestions = questions.slice(0, 5);

    for (const question of maxQuestions) {
      const input = new TextInputBuilder()
        .setCustomId(question.id)
        .setLabel(question.label.slice(0, 45))
        .setRequired(question.required);

      if (question.placeholder) {
        input.setPlaceholder(question.placeholder.slice(0, 100));
      }

      // Set style based on type
      if (question.type === 'paragraph') {
        input.setStyle(TextInputStyle.Paragraph);
        input.setMaxLength(1000);
      } else {
        input.setStyle(TextInputStyle.Short);
        input.setMaxLength(256);
      }

      // For select type, show options as placeholder hint
      if (question.type === 'select' && question.options?.length) {
        input.setPlaceholder(`Options: ${question.options.join(', ')}`.slice(0, 100));
      }

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
      modal.addComponents(row);
    }

    await interaction.showModal(modal);
  }

  /**
   * Handle form modal submission
   */
  static async handleFormModal(interaction: ModalSubmitInteraction): Promise<void> {
    const customId = interaction.customId;
    if (!customId.startsWith('ticket_form_')) return;

    await interaction.deferReply({ ephemeral: true });

    const categoryId = customId.replace('ticket_form_', '');
    const member = interaction.member as GuildMember;

    // Fetch category
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      await interaction.editReply('❌ Category not found.');
      return;
    }

    // Collect form responses
    const formQuestions = (category.formQuestions as FormQuestion[] | null) || [];
    const formResponses: Record<string, string> = {};

    for (const question of formQuestions) {
      try {
        const value = interaction.fields.getTextInputValue(question.id);
        formResponses[question.id] = value;
      } catch {
        // Field not found, skip
      }
    }

    // Create ticket
    const channel = await this.createTicket(interaction.guild!, member, categoryId, {
      formResponses,
    });

    if (channel) {
      await interaction.editReply(`✅ Ticket created! <#${channel.id}>`);
    } else {
      await interaction.editReply('❌ Failed to create ticket. You may already have an open ticket.');
    }
  }

  /**
   * Create ticket channel with category configuration
   */
  static async createTicket(
    guild: Guild,
    member: GuildMember,
    categoryId: string,
    options: {
      formResponses?: Record<string, string>;
      subject?: string;
    } = {}
  ): Promise<TextChannel | null> {
    // Fetch category with guild settings
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
      include: {
        panel: true,
        guild: {
          include: { settings: true },
        },
      },
    });

    if (!category) return null;

    const settings = category.guild?.settings;

    // Get or create member record
    await ensureGuild(guild.id, guild.name);
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

    if (existingTicket) return null;

    // Get next ticket number for this guild
    const ticketCount = await prisma.ticket.count({ where: { guildId: guild.id } });
    const ticketNumber = ticketCount + 1;

    // Determine parent category channel
    const parentCategoryId = category.categoryChannelId || settings?.ticketCategoryId;
    const parentCategory = parentCategoryId
      ? (guild.channels.cache.get(parentCategoryId) as CategoryChannel)
      : null;

    // Generate channel name
    const channelName = category.namingPattern
      ? category.namingPattern
          .replace('{number}', ticketNumber.toString().padStart(4, '0'))
          .replace('{user}', member.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''))
          .replace('{category}', category.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))
      : `ticket-${ticketNumber.toString().padStart(4, '0')}`;

    // Create permission overwrites
    const permissionOverwrites = [
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
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    // Create ticket channel
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentCategory ?? undefined,
      topic: `${category.emoji || '🎫'} ${category.name} | User: ${member.user.tag} | ID: ${member.id}`,
      permissionOverwrites,
    });

    // Add ping roles to channel permissions
    const pingContent: string[] = [`<@${member.id}>`];
    
    if (category.pingRoleIds.length > 0) {
      for (const roleId of category.pingRoleIds) {
        try {
          await channel.permissionOverwrites.create(roleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });
          pingContent.push(`<@&${roleId}>`);
        } catch (e) {
          logger.error(`Failed to add role ${roleId} to ticket:`, e);
        }
      }
    }

    // Save ticket to database
    const ticket = await prisma.ticket.create({
      data: {
        guildId: guild.id,
        memberId: dbMember.id,
        channelId: channel.id,
        number: ticketNumber,
        categoryId: category.id,
        subject: options.subject,
        formResponses: options.formResponses ? JSON.parse(JSON.stringify(options.formResponses)) : null,
      },
    });

    // Build welcome embed
    const formQuestions = (category.formQuestions as FormQuestion[] | null) || [];
    const embedColor = (category.panel?.color || '#5865F2') as ColorResolvable;
    
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`${category.emoji || '🎫'} Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setDescription(
        settings?.ticketWelcomeMessage?.replace('{user}', `<@${member.id}>`).replace('{ticket}', `#${ticketNumber}`) ||
        `Hello ${member}, thank you for creating a ticket!\n\nA staff member will be with you shortly. Please describe your issue in detail while you wait.`
      )
      .addFields(
        { name: 'Category', value: `${category.emoji || '🎫'} ${category.name}`, inline: true },
        { name: 'Created By', value: `<@${member.id}>`, inline: true },
        { name: 'Status', value: '🟢 Open', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${ticket.id.slice(0, 8)}` })
      .setTimestamp();

    // Add form responses if any
    if (options.formResponses && Object.keys(options.formResponses).length > 0) {
      const responseFields: { name: string; value: string; inline: boolean }[] = [];
      
      for (const question of formQuestions) {
        const answer = options.formResponses[question.id];
        if (answer) {
          responseFields.push({
            name: question.label,
            value: answer.slice(0, 1024),
            inline: question.type !== 'paragraph',
          });
        }
      }

      // Add up to 10 more fields (Discord limit is 25 total, we used 3)
      for (const field of responseFields.slice(0, 10)) {
        embed.addFields(field);
      }
    }

    // Create action buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✋')
        .setDisabled(!category.claimEnabled),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    // Send welcome message
    await channel.send({
      content: pingContent.join(' '),
      embeds: [embed],
      components: [buttons],
    });

    // Log ticket creation
    if (settings?.ticketLogChannelId) {
      const logChannel = guild.channels.cache.get(settings.ticketLogChannelId) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📥 Ticket Created')
          .addFields(
            { name: 'Ticket', value: `#${ticketNumber} (<#${channel.id}>)`, inline: true },
            { name: 'Category', value: `${category.emoji || '🎫'} ${category.name}`, inline: true },
            { name: 'User', value: `${member.user.tag} (<@${member.id}>)`, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }

    logger.info(`Ticket #${ticketNumber} created for ${member.user.tag} in category "${category.name}"`);
    return channel;
  }
}
