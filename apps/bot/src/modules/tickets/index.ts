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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  Message,
  User,
  AttachmentBuilder,
} from 'discord.js';
import { prisma, TicketStatus } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';
import { TranscriptService } from './transcripts.js';
import { logger } from '../../utils/logger.js';

// Types for form questions from dashboard
interface FormQuestion {
  id: string;
  label: string;
  type: 'short' | 'paragraph' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
  minLength?: number;
  maxLength?: number;
}

// Store question ID to label mapping for modal responses
const questionLabelMap = new Map<string, Map<string, string>>();

// Store pending select responses for multi-step flow
interface PendingTicketData {
  categoryId: string;
  selectResponses: Record<string, string>;
  textQuestions: FormQuestion[];
  userId: string;
  expiresAt: number;
}
const pendingTicketSelects = new Map<string, PendingTicketData>();

// Clean up expired pending data every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of pendingTicketSelects) {
    if (data.expiresAt < now) {
      pendingTicketSelects.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Message config type from dashboard
interface MessageConfig {
  enabled: boolean;
  content?: string;
  embed?: {
    enabled: boolean;
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: string;
    image?: string;
    footer?: string;
    footerIcon?: string;
    author?: string;
    authorIcon?: string;
    authorUrl?: string;
    timestamp?: boolean;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  };
}

/**
 * Build embed from message config
 */
function buildEmbedFromConfig(
  config: MessageConfig | null,
  placeholders: Record<string, string>,
  defaultEmbed: EmbedBuilder
): EmbedBuilder {
  if (!config?.embed?.enabled) {
    return defaultEmbed;
  }

  const embed = new EmbedBuilder();
  
  // Color
  if (config.embed.color) {
    const colorInt = parseInt(config.embed.color.replace('#', ''), 16);
    embed.setColor(colorInt);
  } else {
    embed.setColor(0x5865f2);
  }

  // Title
  if (config.embed.title) {
    embed.setTitle(replacePlaceholders(config.embed.title, placeholders));
  }

  // Description
  if (config.embed.description) {
    embed.setDescription(replacePlaceholders(config.embed.description, placeholders));
  }

  // Thumbnail
  if (config.embed.thumbnail) {
    embed.setThumbnail(config.embed.thumbnail);
  }

  // Image
  if (config.embed.image) {
    embed.setImage(config.embed.image);
  }

  // Footer
  if (config.embed.footer) {
    embed.setFooter({
      text: replacePlaceholders(config.embed.footer, placeholders),
      iconURL: config.embed.footerIcon || undefined,
    });
  }

  // Author
  if (config.embed.author) {
    embed.setAuthor({
      name: replacePlaceholders(config.embed.author, placeholders),
      iconURL: config.embed.authorIcon || undefined,
      url: config.embed.authorUrl || undefined,
    });
  }

  // Timestamp
  if (config.embed.timestamp) {
    embed.setTimestamp();
  }

  // Fields
  if (config.embed.fields && config.embed.fields.length > 0) {
    for (const field of config.embed.fields) {
      embed.addFields({
        name: replacePlaceholders(field.name, placeholders),
        value: replacePlaceholders(field.value, placeholders),
        inline: field.inline ?? false,
      });
    }
  }

  return embed;
}

/**
 * Replace placeholders in string
 */
function replacePlaceholders(text: string, placeholders: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Support ticket system module with enhanced features
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

    await ensureGuild(channel.guild.id, channel.guild.name);

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
    options: {
      categoryId?: string;
      productId?: string;
      platformUsername?: string;
      issueDetails?: string;
      formResponses?: Record<string, string>;
    } = {}
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
      return null;
    }

    // Get ticket category
    const ticketCategory = guild.channels.cache.get(
      settings.ticketCategoryId
    ) as CategoryChannel;

    // Generate ticket number
    const ticketCount = await prisma.ticket.count({ where: { guildId: guild.id } });
    const ticketNumber = ticketCount + 1;

    // Create ticket channel
    const channel = await guild.channels.create({
      name: `ticket-${ticketNumber}`,
      type: ChannelType.GuildText,
      parent: ticketCategory,
      topic: `User: ${member.user.tag} | ID: ${member.id}`,
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

    // Handle category specific roles from ticket category
    let assignedRoles: string[] = [];
    if (options.categoryId) {
      const ticketCat = await prisma.ticketCategory.findUnique({
        where: { id: options.categoryId },
      });
      if (ticketCat && ticketCat.pingRoleIds.length > 0) {
        assignedRoles = ticketCat.pingRoleIds;
        for (const roleId of assignedRoles) {
          try {
            await channel.permissionOverwrites.create(roleId, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
            });
          } catch (e) {
            logger.error(`Failed to add role ${roleId} to ticket:`, e);
          }
        }
      }
    }

    // Handle product specific roles
    if (options.productId) {
      const product = await prisma.ticketProduct.findUnique({
        where: { id: options.productId },
      });
      if (product && product.assignedRoleIds.length > 0) {
        for (const roleId of product.assignedRoleIds) {
          if (!assignedRoles.includes(roleId)) {
            assignedRoles.push(roleId);
            try {
              await channel.permissionOverwrites.create(roleId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
              });
            } catch (e) {
              logger.error(`Failed to add role ${roleId} to ticket:`, e);
            }
          }
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
        categoryId: options.categoryId,
        productId: options.productId,
        platformUsername: options.platformUsername,
        issueDetails: options.issueDetails,
        formResponses: options.formResponses || null,
      },
    });

    // Build placeholders
    const placeholders = {
      user: `<@${member.id}>`,
      username: member.user.username,
      ticket: ticketNumber.toString(),
      server: guild.name,
    };

    // Build embed from config or default
    const welcomeConfig = settings.ticketWelcomeConfig as MessageConfig | null;
    const defaultEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎫 Ticket Created')
      .setDescription(
        replacePlaceholders(
          settings.ticketWelcomeMessage || 'Hello {user}, thank you for creating a ticket.\nA staff member will be with you shortly.',
          placeholders
        )
      )
      .setFooter({ text: `Ticket #${ticketNumber} | ID: ${ticket.id.slice(0, 8)}` })
      .setTimestamp();

    const embed = buildEmbedFromConfig(welcomeConfig, placeholders, defaultEmbed);

    // Add form responses as fields
    const embedFields = [];
    
    if (options.issueDetails) {
      embedFields.push({ name: '📝 Issue Details', value: options.issueDetails, inline: false });
    }
    if (options.platformUsername) {
      embedFields.push({ name: '👤 Platform Username', value: options.platformUsername, inline: true });
    }
    
    // Add form responses with emoji labels
    if (options.formResponses) {
      for (const [label, value] of Object.entries(options.formResponses)) {
        if (value) {
          // Add emoji if not present
          const displayLabel = label.match(/^[\p{Emoji}]/u) ? label : `📝 ${label}`;
          embedFields.push({ 
            name: displayLabel.substring(0, 256), 
            value: value.substring(0, 1024), 
            inline: false 
          });
        }
      }
    }

    if (embedFields.length > 0) {
      embed.addFields(embedFields);
    }
    
    // Ensure footer includes ticket number
    if (!embed.data.footer?.text) {
      embed.setFooter({ text: `Ticket #${ticketNumber} | ID: ${ticket.id.slice(0, 8)}` });
    }

    // Create buttons
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
      content: `${member} ${assignedRoles.map(id => `<@&${id}>`).join(' ')}`.trim(),
      embeds: [embed],
      components: [buttons],
    });

    logger.info(`Ticket #${ticketNumber} created for ${member.user.tag}: ${channel.name}`);
    return channel;
  }

  /**
   * Handle ticket create button
   */
  static async handleCreate(interaction: ButtonInteraction): Promise<void> {
    const guildId = interaction.guildId!;

    // Check for existing ticket first
    const member = interaction.member as GuildMember;
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

    // Check for panels with categories
    const panels = await prisma.ticketPanel.findMany({
      where: { guildId, enabled: true },
      include: { categories: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
    });

    // Find categories from all panels
    const allCategories = panels.flatMap(p => p.categories);

    if (allCategories.length > 0) {
      const select = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Select the support category')
        .addOptions(
          allCategories.slice(0, 25).map(c =>
            new StringSelectMenuOptionBuilder()
              .setLabel(c.name)
              .setValue(c.id)
              .setDescription(c.description?.substring(0, 100) || 'Support category')
              .setEmoji(c.emoji || '🎫')
          )
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

      await interaction.reply({
        content: '📋 Please select a category for your ticket:',
        components: [row],
        ephemeral: true,
      });
      return;
    }

    // Fallback: Show generic modal
    await this.showTicketModal(interaction, 'generic', null);
  }

  /**
   * Handle Category Selection
   */
  static async handleCategorySelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const categoryId = interaction.values[0];
    
    // Fetch category with form questions
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      await interaction.reply({ content: '❌ Category not found.', ephemeral: true });
      return;
    }

    const formQuestions = category.formQuestions as FormQuestion[] | null;
    
    // Check if there are select-type questions
    const selectQuestions = formQuestions?.filter(q => q.type === 'select' && q.options && q.options.length > 0) || [];
    const textQuestions = formQuestions?.filter(q => q.type !== 'select') || [];

    // If there are select questions, show them first with dropdown menus
    if (selectQuestions.length > 0) {
      await this.showSelectMenus(interaction, categoryId, selectQuestions, textQuestions);
    } else {
      // No select questions, go directly to modal
      await this.showTicketModal(interaction, categoryId, formQuestions);
    }
  }

  /**
   * Show select menu(s) for select-type form questions
   */
  private static async showSelectMenus(
    interaction: StringSelectMenuInteraction,
    categoryId: string,
    selectQuestions: FormQuestion[],
    textQuestions: FormQuestion[]
  ): Promise<void> {
    // Create unique key for this user's pending ticket
    const pendingKey = `${interaction.user.id}_${categoryId}`;
    
    // Store pending data
    pendingTicketSelects.set(pendingKey, {
      categoryId,
      selectResponses: {},
      textQuestions,
      userId: interaction.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    });

    // Build select menus (max 5 per message, and max 25 options per select)
    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
    
    for (let i = 0; i < Math.min(selectQuestions.length, 5); i++) {
      const q = selectQuestions[i];
      const options = q.options?.slice(0, 25) || [];
      
      if (options.length === 0) continue;

      const select = new StringSelectMenuBuilder()
        .setCustomId(`ticket_form_select_${i}_${pendingKey}`)
        .setPlaceholder(`${q.required ? '* ' : ''}${q.label}`)
        .addOptions(
          options.map((opt, idx) => 
            new StringSelectMenuOptionBuilder()
              .setLabel(opt.substring(0, 100))
              .setValue(`opt_${idx}_${opt.substring(0, 80)}`)
              .setDescription(q.label.substring(0, 100))
          )
        );

      if (!q.required) {
        select.setMinValues(0);
        select.setMaxValues(1);
      }

      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    }

    // Add continue button
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_form_continue_${pendingKey}`)
        .setLabel(textQuestions.length > 0 ? 'Continue →' : 'Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✅')
    );

    // Build embed showing what needs to be selected
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📋 Please fill out the form')
      .setDescription(
        selectQuestions.map((q, i) => 
          `**${i + 1}. ${q.label}**${q.required ? ' *(required)*' : ''}`
        ).join('\n\n')
      )
      .setFooter({ text: 'Select your choices from the dropdowns below, then click Continue' });

    await interaction.reply({
      embeds: [embed],
      components: [...rows, buttonRow],
      ephemeral: true,
    });
  }

  /**
   * Handle form select menu selection
   */
  static async handleFormSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const customId = interaction.customId;
    // Format: ticket_form_select_{index}_{pendingKey}
    const parts = customId.split('_');
    const selectIndex = parseInt(parts[3]);
    const pendingKey = parts.slice(4).join('_');

    const pendingData = pendingTicketSelects.get(pendingKey);
    if (!pendingData) {
      await interaction.reply({ content: '❌ Session expired. Please start over.', ephemeral: true });
      return;
    }

    if (pendingData.userId !== interaction.user.id) {
      await interaction.reply({ content: '❌ This form is not for you.', ephemeral: true });
      return;
    }

    // Fetch category to get question labels
    const category = await prisma.ticketCategory.findUnique({
      where: { id: pendingData.categoryId },
    });

    if (!category) {
      await interaction.reply({ content: '❌ Category not found.', ephemeral: true });
      return;
    }

    const formQuestions = category.formQuestions as FormQuestion[] | null;
    const selectQuestions = formQuestions?.filter(q => q.type === 'select' && q.options && q.options.length > 0) || [];
    
    if (selectIndex >= selectQuestions.length) {
      await interaction.reply({ content: '❌ Invalid selection.', ephemeral: true });
      return;
    }

    const question = selectQuestions[selectIndex];
    // Extract the actual option text from the value (format: opt_{idx}_{text})
    const selectedValue = interaction.values[0];
    const optionText = selectedValue.split('_').slice(2).join('_');
    
    // Store the response
    pendingData.selectResponses[question.label] = optionText;
    pendingTicketSelects.set(pendingKey, pendingData);

    // Update the message to show selection
    await interaction.deferUpdate();
  }

  /**
   * Handle form continue button
   */
  static async handleFormContinue(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    // Format: ticket_form_continue_{pendingKey}
    const pendingKey = customId.replace('ticket_form_continue_', '');

    const pendingData = pendingTicketSelects.get(pendingKey);
    if (!pendingData) {
      await interaction.reply({ content: '❌ Session expired. Please start over.', ephemeral: true });
      return;
    }

    if (pendingData.userId !== interaction.user.id) {
      await interaction.reply({ content: '❌ This form is not for you.', ephemeral: true });
      return;
    }

    // Fetch category to check required fields
    const category = await prisma.ticketCategory.findUnique({
      where: { id: pendingData.categoryId },
    });

    if (!category) {
      await interaction.reply({ content: '❌ Category not found.', ephemeral: true });
      return;
    }

    const formQuestions = category.formQuestions as FormQuestion[] | null;
    const selectQuestions = formQuestions?.filter(q => q.type === 'select' && q.options && q.options.length > 0) || [];
    
    // Check required fields
    for (const q of selectQuestions) {
      if (q.required && !pendingData.selectResponses[q.label]) {
        await interaction.reply({ 
          content: `❌ Please select a value for: **${q.label}**`, 
          ephemeral: true 
        });
        return;
      }
    }

    // If there are text questions, show modal
    if (pendingData.textQuestions.length > 0) {
      await this.showTicketModalWithSelectData(interaction, pendingData);
    } else {
      // No text questions, create ticket directly with select responses
      await this.createTicketFromSelects(interaction, pendingData);
    }
  }

  /**
   * Show modal with pre-filled select data context
   */
  private static async showTicketModalWithSelectData(
    interaction: ButtonInteraction,
    pendingData: PendingTicketData
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_withselect_${pendingData.categoryId}_${interaction.user.id}`)
      .setTitle('Create Ticket');

    // Store label mapping and select responses
    const labelMap = new Map<string, string>();

    for (const q of pendingData.textQuestions.slice(0, 5)) {
      labelMap.set(q.id, q.label);

      const input = new TextInputBuilder()
        .setCustomId(q.id)
        .setLabel(q.label.substring(0, 45))
        .setRequired(q.required);

      if (q.type === 'paragraph') {
        input.setStyle(TextInputStyle.Paragraph);
        input.setPlaceholder(q.placeholder || 'Enter your answer...');
      } else if (q.type === 'number') {
        input.setStyle(TextInputStyle.Short);
        input.setPlaceholder(q.placeholder || 'Enter a number...');
      } else {
        input.setStyle(TextInputStyle.Short);
        input.setPlaceholder(q.placeholder || '');
      }

      if (q.minLength) input.setMinLength(q.minLength);
      if (q.maxLength) input.setMaxLength(q.maxLength);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    }

    // Store the mappings
    const storageKey = `${pendingData.categoryId}_${interaction.user.id}`;
    questionLabelMap.set(storageKey, labelMap);

    await interaction.showModal(modal);
  }

  /**
   * Create ticket directly from select responses (when no text questions)
   */
  private static async createTicketFromSelects(
    interaction: ButtonInteraction,
    pendingData: PendingTicketData
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member as GuildMember;
    const pendingKey = `${interaction.user.id}_${pendingData.categoryId}`;

    const channel = await this.create(interaction.guild!, member, {
      categoryId: pendingData.categoryId,
      issueDetails: Object.values(pendingData.selectResponses)[0] || 'Support Request',
      formResponses: pendingData.selectResponses,
    });

    // Clean up
    pendingTicketSelects.delete(pendingKey);

    if (!channel) {
      await interaction.editReply('❌ You already have an open ticket, or tickets are not configured.');
      return;
    }

    await interaction.editReply(`✅ Ticket created! <#${channel.id}>`);
  }

  /**
   * Handle Product Selection (legacy)
   */
  static async handleProductSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const productId = interaction.values[0];
    await this.showTicketModal(interaction, productId, null);
  }

  /**
   * Show Ticket Creation Modal with custom form questions (only non-select questions)
   */
  private static async showTicketModal(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    categoryOrProductId: string,
    formQuestions: FormQuestion[] | null
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${categoryOrProductId}`)
      .setTitle('Create Ticket');

    // Store label mapping for this interaction
    const labelMap = new Map<string, string>();

    // Filter out select questions (they should be handled separately)
    const textQuestions = formQuestions?.filter(q => q.type !== 'select') || [];

    // If custom form questions exist, use them
    if (textQuestions.length > 0) {
      for (const q of textQuestions.slice(0, 5)) { // Discord limit: 5 fields
        // Store the label mapping
        labelMap.set(q.id, q.label);

        const input = new TextInputBuilder()
          .setCustomId(q.id)
          .setLabel(q.label.substring(0, 45))
          .setRequired(q.required);

        // Handle different question types
        if (q.type === 'paragraph') {
          input.setStyle(TextInputStyle.Paragraph);
          input.setPlaceholder(q.placeholder || 'Enter your answer...');
        } else if (q.type === 'number') {
          input.setStyle(TextInputStyle.Short);
          input.setPlaceholder(q.placeholder || 'Enter a number...');
        } else {
          input.setStyle(TextInputStyle.Short);
          input.setPlaceholder(q.placeholder || '');
        }

        if (q.minLength) input.setMinLength(q.minLength);
        if (q.maxLength) input.setMaxLength(q.maxLength);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      }

      // Store the label map for this category/product
      questionLabelMap.set(categoryOrProductId, labelMap);
    } else {
      // Default fields
      const issueInput = new TextInputBuilder()
        .setCustomId('issue_details')
        .setLabel('Describe your issue')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Please provide details about your issue...');

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(issueInput));
    }

    await interaction.showModal(modal);
  }

  /**
   * Handle Ticket Modal Submission
   */
  static async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const customId = interaction.customId;
    if (!customId.startsWith('ticket_modal_')) return;

    await interaction.deferReply({ ephemeral: true });

    // Check if this is a modal with pre-selected data
    const isWithSelect = customId.startsWith('ticket_modal_withselect_');
    let categoryId: string;
    let selectResponses: Record<string, string> = {};

    if (isWithSelect) {
      // Format: ticket_modal_withselect_{categoryId}_{userId}
      const parts = customId.replace('ticket_modal_withselect_', '').split('_');
      categoryId = parts[0];
      const userId = parts[1];
      const pendingKey = `${userId}_${categoryId}`;
      
      // Get pending select responses
      const pendingData = pendingTicketSelects.get(pendingKey);
      if (pendingData) {
        selectResponses = pendingData.selectResponses;
        pendingTicketSelects.delete(pendingKey);
      }
    } else {
      categoryId = customId.replace('ticket_modal_', '');
    }

    const isGeneric = categoryId === 'generic';

    // Get the label map for this category
    const storageKey = isWithSelect ? `${categoryId}_${interaction.user.id}` : categoryId;
    const labelMap = questionLabelMap.get(storageKey);

    // Collect form responses with proper labels
    const formResponses: Record<string, string> = { ...selectResponses };
    let issueDetails = '';

    for (const row of interaction.components) {
      for (const component of row.components) {
        if (component.customId === 'issue_details') {
          issueDetails = component.value;
        } else {
          // Use the label from the stored map, fallback to customId
          const label = labelMap?.get(component.customId) || component.customId;
          if (component.value) {
            formResponses[label] = component.value;
          }
        }
      }
    }

    // Clean up the label map
    if (labelMap) {
      questionLabelMap.delete(storageKey);
    }

    const member = interaction.member as GuildMember;

    const channel = await this.create(interaction.guild!, member, {
      categoryId: isGeneric ? undefined : categoryId,
      issueDetails: issueDetails || Object.values(formResponses)[0] || '',
      formResponses: Object.keys(formResponses).length > 0 ? formResponses : undefined,
    });

    if (!channel) {
      await interaction.editReply(
        '❌ You already have an open ticket, or tickets are not configured.'
      );
      return;
    }

    await interaction.editReply(`✅ Ticket created! <#${channel.id}>`);
  }

  /**
   * Claim ticket with custom message
   */
  static async claim(
    interaction: ButtonInteraction,
    staffMember: GuildMember
  ): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: interaction.channel!.id },
      include: { member: true },
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

    // Get settings for custom message
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guildId! },
    });

    // Build placeholders
    const claimPlaceholders = {
      staff: staffMember.toString(),
      staffname: staffMember.user.username,
      user: `<@${ticket.member.discordId}>`,
      ticket: ticket.number?.toString() || '',
    };

    // Build claim embed from config or default
    const claimConfig = settings?.ticketClaimEmbedConfig as MessageConfig | null;
    const defaultClaimEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✋ Ticket Claimed')
      .setDescription(
        replacePlaceholders(
          settings?.ticketClaimMessage || `**{staff}** has claimed this ticket.\n\n{user}, a staff member is now assisting you. Please provide any additional information needed.`,
          claimPlaceholders
        )
      )
      .setFooter({ text: `Claimed by ${staffMember.user.tag}` })
      .setTimestamp();

    const embed = buildEmbedFromConfig(claimConfig, claimPlaceholders, defaultClaimEmbed);

    // Update the original message buttons
    const originalMessage = interaction.message;
    const newButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claimed')
        .setLabel(`Claimed by ${staffMember.user.username}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✅')
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    try {
      await originalMessage.edit({ components: [newButtons] });
    } catch {
      // Message might be too old to edit
    }

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Close ticket with thank you message and rating form
   */
  static async close(
    channel: TextChannel,
    closedBy: GuildMember,
    reason?: string
  ): Promise<string | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: channel.id },
      include: { member: true },
    });

    if (!ticket) return null;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: channel.guild.id },
    });

    // Generate transcript
    let transcriptUrl: string | null = null;
    try {
      transcriptUrl = await TranscriptService.generate(channel, ticket.id);
    } catch (error) {
      logger.error('Failed to generate transcript:', error);
    }

    // Update ticket status
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CLOSED,
        closedBy: closedBy.id,
        closedAt: new Date(),
        transcriptUrl,
      },
    });

    // Build placeholders
    const closePlaceholders = {
      user: `<@${ticket.member.discordId}>`,
      staff: closedBy.toString(),
      ticket: ticket.number?.toString() || '',
      reason: reason || 'No reason provided',
    };

    // Determine transcript display
    const isLocalTranscript = transcriptUrl?.startsWith('local://');
    const transcriptPath = isLocalTranscript ? transcriptUrl.replace('local://', '') : null;
    const transcriptDisplay = transcriptUrl 
      ? (isLocalTranscript ? '📎 Attached below' : `[View](${transcriptUrl})`)
      : 'Not available';

    // Build thank you embed from config or default
    const thankYouConfig = settings?.ticketThankYouEmbedConfig as MessageConfig | null;
    const defaultThankYouEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎫 Ticket Closed')
      .setDescription(
        replacePlaceholders(
          settings?.ticketThankYouMessage || 'Thank you for contacting support!\n\nWe hope we were able to help you. If you have any more questions, feel free to open a new ticket.',
          closePlaceholders
        )
      )
      .addFields(
        { name: '📋 Closed By', value: closedBy.toString(), inline: true },
        { name: '📄 Transcript', value: transcriptDisplay, inline: true }
      )
      .setTimestamp();

    if (reason) {
      defaultThankYouEmbed.addFields({ name: '📝 Reason', value: reason, inline: false });
    }

    const thankYouEmbed = buildEmbedFromConfig(thankYouConfig, closePlaceholders, defaultThankYouEmbed);
    
    // Always add transcript info
    if (!thankYouEmbed.data.fields?.some(f => f.name.includes('Transcript'))) {
      thankYouEmbed.addFields(
        { name: '📋 Closed By', value: closedBy.toString(), inline: true },
        { name: '📄 Transcript', value: transcriptDisplay, inline: true }
      );
    }

    // Rating buttons (1-5 stars)
    const ratingRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('ticket_rate_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_rate_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_rate_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_rate_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_rate_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
    );

    // Reopen button (only if enabled and no auto-delete)
    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    
    if (settings?.ticketReopenEnabled !== false) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_reopen')
          .setLabel('Reopen Ticket')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓')
      );
    }

    // Prepare message options
    const messageOptions: {
      content: string;
      embeds: EmbedBuilder[];
      components: ActionRowBuilder<ButtonBuilder>[];
      files?: AttachmentBuilder[];
    } = {
      content: `<@${ticket.member.discordId}> Please rate your support experience:`,
      embeds: [thankYouEmbed],
      components: [ratingRow, ...(actionRow.components.length > 0 ? [actionRow] : [])],
    };

    // Attach transcript file if local
    if (isLocalTranscript && transcriptPath) {
      try {
        messageOptions.files = [
          new AttachmentBuilder(transcriptPath, { name: `transcript-${ticket.number}.html` })
        ];
      } catch (error) {
        logger.error('Failed to attach transcript file:', error);
      }
    }

    // Send thank you message with rating
    const thankYouMsg = await channel.send(messageOptions);

    logger.info(`Ticket #${ticket.number} closed by ${closedBy.user.tag}`);

    // Handle auto-delete
    const deleteDelay = settings?.ticketDeleteDelay ?? 0;
    if (deleteDelay > 0) {
      setTimeout(async () => {
        // Check if ticket was reopened
        const currentTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        if (currentTicket?.status === TicketStatus.CLOSED) {
          try {
            await channel.delete('Ticket closed - auto delete');
          } catch (error) {
            logger.error('Failed to delete ticket channel:', error);
          }
        }
      }, deleteDelay * 1000);
    }

    return transcriptUrl;
  }

  /**
   * Handle rating button - Show review modal for ALL ratings
   */
  static async handleRating(interaction: ButtonInteraction): Promise<void> {
    const rating = parseInt(interaction.customId.replace('ticket_rate_', ''));
    
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: interaction.channel!.id },
      include: { member: true },
    });

    if (!ticket) {
      await interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      return;
    }

    // Only ticket creator can rate
    if (ticket.member.discordId !== interaction.user.id) {
      await interaction.reply({ content: '❌ Only the ticket creator can rate.', ephemeral: true });
      return;
    }

    // Check if already rated
    const existingRating = await prisma.ticketRating.findUnique({
      where: { ticketId: ticket.id },
    });

    if (existingRating) {
      await interaction.reply({ content: '❌ You have already rated this ticket.', ephemeral: true });
      return;
    }

    // Show review modal for ALL ratings (1-5 stars)
    const starsDisplay = '⭐'.repeat(rating);
    const modal = new ModalBuilder()
      .setCustomId(`ticket_review_${ticket.id}_${rating}`)
      .setTitle(`Rate ${starsDisplay}`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('review_text')
            .setLabel('Share your feedback (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('What did you think about our support? Your feedback helps us improve...')
            .setMaxLength(500)
        )
      );

    await interaction.showModal(modal);
  }

  /**
   * Handle review modal submission
   */
  static async handleReviewModal(interaction: ModalSubmitInteraction): Promise<void> {
    // Format: ticket_review_{ticketId}_{rating}
    const parts = interaction.customId.split('_');
    const ticketId = parts[2];
    const rating = parseInt(parts[3]);
    const review = interaction.fields.getTextInputValue('review_text') || null;

    await this.saveRating(interaction, ticketId, rating, review);
  }

  /**
   * Save rating to database and post to channel
   */
  private static async saveRating(
    interaction: ButtonInteraction | ModalSubmitInteraction,
    ticketId: string,
    stars: number,
    review: string | null
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { member: true },
    });

    if (!ticket) {
      await interaction.editReply('❌ Ticket not found.');
      return;
    }

    // Create rating
    const ticketRating = await prisma.ticketRating.create({
      data: {
        ticketId,
        stars,
        review,
        staffId: ticket.claimedBy,
      },
    });

    // Get settings
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: ticket.guildId },
    });

    // Post to rating channel if configured
    if (settings?.ratingChannelId) {
      try {
        const guild = interaction.guild!;
        const ratingChannel = await guild.channels.fetch(settings.ratingChannelId) as TextChannel;
        
        if (ratingChannel && 'send' in ratingChannel) {
          const starsDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
          const member = await guild.members.fetch(ticket.member.discordId).catch(() => null);
          const staffMember = ticket.claimedBy 
            ? await guild.members.fetch(ticket.claimedBy).catch(() => null)
            : null;

          // Build placeholders for custom message
          const ratingPlaceholders = {
            user: member?.toString() || 'Unknown User',
            username: member?.user.username || 'Unknown',
            staff: staffMember?.toString() || 'N/A',
            staffname: staffMember?.user.username || 'N/A',
            ticket: `#${ticket.number}`,
            ticketId: ticket.id,
            stars: stars.toString(),
            starsDisplay,
            review: review || '*No written review*',
          };

          // Build rating review embed from config or default
          const ratingReviewConfig = settings.ratingReviewConfig as MessageConfig | null;
          const defaultReviewEmbed = new EmbedBuilder()
            .setColor(stars >= 4 ? 0x57F287 : stars >= 3 ? 0xFEE75C : 0xED4245)
            .setTitle('📝 New Ticket Review')
            .setDescription(review || '*No written review*')
            .addFields(
              { name: 'Rating', value: starsDisplay, inline: true },
              { name: 'From', value: member?.toString() || 'Unknown User', inline: true },
              { name: 'Ticket', value: `#${ticket.number}`, inline: true },
            )
            .setTimestamp();

          if (staffMember) {
            defaultReviewEmbed.addFields({ name: 'Staff', value: staffMember.toString(), inline: true });
          }

          const reviewEmbed = buildEmbedFromConfig(ratingReviewConfig, ratingPlaceholders, defaultReviewEmbed);

          // Add buttons for re-rate and reopen
          const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`rating_rerate_${ticketId}`)
              .setLabel('Đánh giá lại')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🔄'),
            new ButtonBuilder()
              .setCustomId(`rating_reopen_${ticketId}`)
              .setLabel('Mở lại ticket')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🔓')
          );

          await ratingChannel.send({ 
            embeds: [reviewEmbed],
            components: [actionRow],
          });
        }
      } catch (error) {
        logger.error('Failed to post rating to channel:', error);
      }
    }

    // Update original message to show rating was submitted
    try {
      const originalMessage = interaction.message;
      if (originalMessage && 'edit' in originalMessage) {
        const disabledRatingRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...Array.from({ length: 5 }, (_, i) =>
            new ButtonBuilder()
              .setCustomId(`ticket_rate_${i + 1}`)
              .setLabel('⭐'.repeat(i + 1))
              .setStyle(i + 1 === stars ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(true)
          )
        );

        await (originalMessage as Message).edit({ components: [disabledRatingRow] });
      }
    } catch {
      // Message might not be editable
    }

    await interaction.editReply(`✅ Thank you for your ${stars}-star rating! This ticket will close in 5 seconds.`);

    // Auto-close ticket after rating
    const deleteDelay = settings?.ticketDeleteDelay ?? 5; // Default 5 seconds if not set
    setTimeout(async () => {
      try {
        const channel = interaction.channel as TextChannel;
        if (channel) {
          // Send closing message
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x5865f2)
                .setDescription('🔒 **Ticket closing after rating submission...**')
                .setTimestamp()
            ]
          });
          
          // Delete after short delay
          setTimeout(async () => {
            try {
              await channel.delete('Ticket closed after rating');
            } catch (error) {
              logger.error('Failed to delete ticket channel:', error);
            }
          }, 2000);
        }
      } catch (error) {
        logger.error('Failed to close ticket after rating:', error);
      }
    }, Math.max(deleteDelay, 5) * 1000);
  }

  /**
   * Reopen a closed ticket
   */
  static async reopen(interaction: ButtonInteraction): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: interaction.channel!.id },
      include: { member: true },
    });

    if (!ticket) {
      await interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      return;
    }

    if (ticket.status !== TicketStatus.CLOSED) {
      await interaction.reply({ content: '❌ This ticket is not closed.', ephemeral: true });
      return;
    }

    // Check permission - only ticket creator or staff with manage channels
    const member = interaction.member as GuildMember;
    const isCreator = ticket.member.discordId === member.id;
    const hasPermission = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!isCreator && !hasPermission) {
      await interaction.reply({ 
        content: '❌ Only the ticket creator or staff can reopen this ticket.', 
        ephemeral: true 
      });
      return;
    }

    // Reopen ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.OPEN,
        closedBy: null,
        closedAt: null,
      },
    });

    // Build buttons
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

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🔓 Ticket Reopened')
      .setDescription(`This ticket has been reopened by ${member}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [buttons] });
    
    logger.info(`Ticket #${ticket.number} reopened by ${member.user.tag}`);
  }

  /**
   * Handle re-rate button from rating channel
   */
  static async handleRerateButton(interaction: ButtonInteraction): Promise<void> {
    const ticketId = interaction.customId.replace('rating_rerate_', '');
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { member: true },
    });

    if (!ticket) {
      await interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      return;
    }

    // Only ticket creator can re-rate
    if (ticket.member.discordId !== interaction.user.id) {
      await interaction.reply({ content: '❌ Only the ticket creator can re-rate.', ephemeral: true });
      return;
    }

    // Delete existing rating
    await prisma.ticketRating.deleteMany({
      where: { ticketId },
    });

    // Show rating selection
    const ratingRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`rerate_${ticketId}_1`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rerate_${ticketId}_2`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rerate_${ticketId}_3`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rerate_${ticketId}_4`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rerate_${ticketId}_5`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: '🔄 **Đánh giá lại** - Chọn số sao mới:',
      components: [ratingRow],
      ephemeral: true,
    });
  }

  /**
   * Handle re-rate star selection
   */
  static async handleRerateSelect(interaction: ButtonInteraction): Promise<void> {
    // Format: rerate_{ticketId}_{stars}
    const parts = interaction.customId.split('_');
    const ticketId = parts[1];
    const stars = parseInt(parts[2]);

    const starsDisplay = '⭐'.repeat(stars);
    const modal = new ModalBuilder()
      .setCustomId(`rerate_modal_${ticketId}_${stars}`)
      .setTitle(`Đánh giá lại ${starsDisplay}`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('review_text')
            .setLabel('Nhận xét của bạn (tùy chọn)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Chia sẻ trải nghiệm của bạn...')
            .setMaxLength(500)
        )
      );

    await interaction.showModal(modal);
  }

  /**
   * Handle re-rate modal submission
   */
  static async handleRerateModal(interaction: ModalSubmitInteraction): Promise<void> {
    // Format: rerate_modal_{ticketId}_{stars}
    const parts = interaction.customId.split('_');
    const ticketId = parts[2];
    const stars = parseInt(parts[3]);
    const review = interaction.fields.getTextInputValue('review_text') || null;

    await interaction.deferReply({ ephemeral: true });

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { member: true },
    });

    if (!ticket) {
      await interaction.editReply('❌ Ticket not found.');
      return;
    }

    // Create new rating
    await prisma.ticketRating.create({
      data: {
        ticketId,
        stars,
        review,
        staffId: ticket.claimedBy,
      },
    });

    // Update the original rating message in the channel
    try {
      const originalMessage = interaction.message;
      if (originalMessage && 'edit' in originalMessage) {
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId: ticket.guildId },
        });

        const guild = interaction.guild!;
        const member = await guild.members.fetch(ticket.member.discordId).catch(() => null);
        const staffMember = ticket.claimedBy 
          ? await guild.members.fetch(ticket.claimedBy).catch(() => null)
          : null;

        const starsDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

        // Build updated embed
        const ratingPlaceholders = {
          user: member?.toString() || 'Unknown User',
          username: member?.user.username || 'Unknown',
          staff: staffMember?.toString() || 'N/A',
          staffname: staffMember?.user.username || 'N/A',
          ticket: `#${ticket.number}`,
          ticketId: ticket.id,
          stars: stars.toString(),
          starsDisplay,
          review: review || '*No written review*',
        };

        const ratingReviewConfig = settings?.ratingReviewConfig as MessageConfig | null;
        const defaultReviewEmbed = new EmbedBuilder()
          .setColor(stars >= 4 ? 0x57F287 : stars >= 3 ? 0xFEE75C : 0xED4245)
          .setTitle('📝 Ticket Review (Updated)')
          .setDescription(review || '*No written review*')
          .addFields(
            { name: 'Rating', value: starsDisplay, inline: true },
            { name: 'From', value: member?.toString() || 'Unknown User', inline: true },
            { name: 'Ticket', value: `#${ticket.number}`, inline: true },
          )
          .setTimestamp();

        if (staffMember) {
          defaultReviewEmbed.addFields({ name: 'Staff', value: staffMember.toString(), inline: true });
        }

        const reviewEmbed = buildEmbedFromConfig(ratingReviewConfig, ratingPlaceholders, defaultReviewEmbed);
        reviewEmbed.setTitle('📝 Ticket Review (Updated)');

        await (originalMessage as Message).edit({ embeds: [reviewEmbed] });
      }
    } catch (error) {
      logger.error('Failed to update rating message:', error);
    }

    await interaction.editReply(`✅ Đã cập nhật đánh giá ${stars} sao!`);
  }

  /**
   * Handle reopen button from rating channel - Show reason modal
   */
  static async handleReopenFromRatingButton(interaction: ButtonInteraction): Promise<void> {
    const ticketId = interaction.customId.replace('rating_reopen_', '');
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { member: true },
    });

    if (!ticket) {
      await interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
      return;
    }

    // Check permission - only ticket creator or staff with manage channels
    const member = interaction.member as GuildMember;
    const isCreator = ticket.member.discordId === member.id;
    const hasPermission = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!isCreator && !hasPermission) {
      await interaction.reply({ 
        content: '❌ Chỉ người tạo ticket hoặc staff mới có thể mở lại ticket.', 
        ephemeral: true 
      });
      return;
    }

    // Show modal for reason
    const modal = new ModalBuilder()
      .setCustomId(`reopen_reason_${ticketId}`)
      .setTitle('Mở lại Ticket')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('reopen_reason')
            .setLabel('Lý do mở lại ticket')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Vui lòng cho biết lý do bạn muốn mở lại ticket này...')
            .setMinLength(10)
            .setMaxLength(500)
        )
      );

    await interaction.showModal(modal);
  }

  /**
   * Handle reopen reason modal submission
   */
  static async handleReopenReasonModal(interaction: ModalSubmitInteraction): Promise<void> {
    const ticketId = interaction.customId.replace('reopen_reason_', '');
    const reason = interaction.fields.getTextInputValue('reopen_reason');

    await interaction.deferReply({ ephemeral: true });

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { member: true },
    });

    if (!ticket) {
      await interaction.editReply('❌ Ticket not found.');
      return;
    }

    // Try to find the ticket channel
    const guild = interaction.guild!;
    let ticketChannel: TextChannel | null = null;
    
    try {
      ticketChannel = await guild.channels.fetch(ticket.channelId) as TextChannel;
    } catch {
      // Channel might be deleted
    }

    if (!ticketChannel) {
      await interaction.editReply('❌ Ticket channel không còn tồn tại.');
      return;
    }

    // Reopen ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.OPEN,
        closedBy: null,
        closedAt: null,
      },
    });

    // Send reopen message to ticket channel
    const member = interaction.member as GuildMember;
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

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔓 Ticket Reopened')
      .setDescription(`Ticket này đã được mở lại bởi ${member}.`)
      .addFields({ name: '📝 Lý do', value: reason })
      .setTimestamp();

    await ticketChannel.send({ embeds: [embed], components: [buttons] });

    // Update the rating message to disable buttons
    try {
      const originalMessage = interaction.message;
      if (originalMessage && 'edit' in originalMessage) {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('rating_rerate_disabled')
            .setLabel('Đánh giá lại')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('rating_reopen_disabled')
            .setLabel('Đã mở lại')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(true)
        );

        await (originalMessage as Message).edit({ components: [disabledRow] });
      }
    } catch {
      // Message might not be editable
    }

    await interaction.editReply(`✅ Đã mở lại ticket <#${ticketChannel.id}>!`);
    
    logger.info(`Ticket #${ticket.number} reopened from rating channel by ${member.user.tag}`);
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

  /**
   * Replace placeholders in message
   */
  private static replacePlaceholders(message: string, placeholders: Record<string, string>): string {
    let result = message;
    for (const [key, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
    }
    return result;
  }
}
