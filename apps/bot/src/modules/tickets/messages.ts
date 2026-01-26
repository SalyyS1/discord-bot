/**
 * Ticket Messages Module
 * Uses MessageBuilder for all ticket-related messages
 */

import type { TextChannel, GuildMember, Message } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { compileMessage } from '@repo/config';
import type { MessageConfig, TemplateContext } from '@repo/types';
// createDefaultWelcomeConfig available if needed from @repo/types
import { prisma } from '@repo/database';

// ═══════════════════════════════════════════════
// Default Configurations
// ═══════════════════════════════════════════════

export function getDefaultTicketWelcomeConfig(): MessageConfig {
  return {
    version: 2,
    content: '',
    embeds: [{
      title: 'Support Ticket',
      description: 'Thank you for creating a ticket, {{user.mention}}!\n\nA staff member will be with you shortly. Please describe your issue in detail.',
      color: 0x5865F2,
      fields: [
        { name: 'Ticket ID', value: '`{{ticket.number}}`', inline: true },
        { name: 'Category', value: '{{ticket.product}}', inline: true },
      ],
      footer: { text: 'Use the buttons below to manage this ticket' },
      timestamp: true,
    }],
    components: [],
  };
}

export function getDefaultTicketCloseConfig(): MessageConfig {
  return {
    version: 2,
    content: '',
    embeds: [{
      title: 'Ticket Closed',
      description: 'This ticket has been closed by {{closer.mention}}.',
      color: 0xED4245,
      fields: [],
      footer: { text: 'Thank you for using our support' },
      timestamp: true,
    }],
    components: [],
  };
}

export function getDefaultRatingPromptConfig(): MessageConfig {
  return {
    version: 2,
    content: '',
    embeds: [{
      title: 'Rate Your Experience',
      description: 'How would you rate the support you received?',
      color: 0xFEE75C,
      fields: [],
      footer: { text: 'Click a button below to submit your rating' },
    }],
    components: [],
  };
}

// ═══════════════════════════════════════════════
// Ticket Action Buttons
// ═══════════════════════════════════════════════

export function buildTicketActionRow(ticketId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_${ticketId}`)
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId(`ticket_claim_${ticketId}`)
      .setLabel('Claim')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✋'),
    new ButtonBuilder()
      .setCustomId(`ticket_transcript_${ticketId}`)
      .setLabel('Save Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📄'),
  );
}

export function buildRatingButtons(ticketId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_rate_${ticketId}_1`)
      .setLabel('1')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⭐'),
    new ButtonBuilder()
      .setCustomId(`ticket_rate_${ticketId}_2`)
      .setLabel('2')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⭐'),
    new ButtonBuilder()
      .setCustomId(`ticket_rate_${ticketId}_3`)
      .setLabel('3')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⭐'),
    new ButtonBuilder()
      .setCustomId(`ticket_rate_${ticketId}_4`)
      .setLabel('4')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⭐'),
    new ButtonBuilder()
      .setCustomId(`ticket_rate_${ticketId}_5`)
      .setLabel('5')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⭐'),
  );
}

// ═══════════════════════════════════════════════
// Send Ticket Welcome Message
// ═══════════════════════════════════════════════

export interface TicketInfo {
  id: string;
  number: string;
  productName?: string;
  formResponses?: Record<string, string>;
}

export async function sendTicketWelcome(
  channel: TextChannel,
  member: GuildMember,
  ticket: TicketInfo,
  customConfig?: MessageConfig | null
): Promise<Message> {
  // Use custom config or default
  const config = customConfig ?? getDefaultTicketWelcomeConfig();

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
    member: {
      nickname: member.nickname ?? undefined,
      joinedAt: member.joinedAt ?? undefined,
      roles: member.roles.cache.map(r => r.name),
    },
    guild: {
      id: channel.guild.id,
      name: channel.guild.name,
      iconUrl: channel.guild.iconURL() ?? undefined,
      memberCount: channel.guild.memberCount,
      createdAt: channel.guild.createdAt,
    },
    channel: {
      id: channel.id,
      name: channel.name,
      mention: `<#${channel.id}>`,
    },
    custom: {
      'ticket.number': ticket.number,
      'ticket.product': ticket.productName || 'General Support',
      ...ticket.formResponses,
    },
    timestamp: new Date(),
  };

  // Compile message
  const compiled = compileMessage(config, context);

  // Send with action buttons
  return channel.send({
    content: compiled.content,
    embeds: compiled.embeds.map(e => EmbedBuilder.from(e)),
    components: [
      ...compiled.components,
      buildTicketActionRow(ticket.id),
    ],
  });
}

// ═══════════════════════════════════════════════
// Send Ticket Close Message
// ═══════════════════════════════════════════════

export async function sendTicketCloseMessage(
  channel: TextChannel,
  closer: GuildMember,
  ticket: TicketInfo,
  customConfig?: MessageConfig | null
): Promise<Message> {
  const config = customConfig ?? getDefaultTicketCloseConfig();

  const context: TemplateContext = {
    user: {
      id: closer.id,
      username: closer.user.username,
      displayName: closer.displayName,
      mention: `<@${closer.id}>`,
      createdAt: closer.user.createdAt,
    },
    custom: {
      'closer.mention': `<@${closer.id}>`,
      'closer.username': closer.user.username,
      'ticket.number': ticket.number,
    },
    timestamp: new Date(),
  };

  const compiled = compileMessage(config, context);

  return channel.send({
    content: compiled.content,
    embeds: compiled.embeds.map(e => EmbedBuilder.from(e)),
    components: compiled.components,
  });
}

// ═══════════════════════════════════════════════
// Send Rating Prompt
// ═══════════════════════════════════════════════

export async function sendRatingPrompt(
  channel: TextChannel,
  ticketId: string,
  customConfig?: MessageConfig | null
): Promise<Message> {
  const config = customConfig ?? getDefaultRatingPromptConfig();

  const context: TemplateContext = {
    timestamp: new Date(),
  };

  const compiled = compileMessage(config, context);

  return channel.send({
    content: compiled.content,
    embeds: compiled.embeds.map(e => EmbedBuilder.from(e)),
    components: [buildRatingButtons(ticketId)],
  });
}

// ═══════════════════════════════════════════════
// Get Product Message Config
// ═══════════════════════════════════════════════

export async function getProductMessageConfig(
  productId: string,
  messageType: 'welcome' | 'close' | 'panel'
): Promise<MessageConfig | null> {
  const product = await prisma.ticketProduct.findUnique({
    where: { id: productId },
  });

  if (!product) return null;

  // Note: TicketProduct schema does not include message config fields
  // Message configs should be stored in GuildSettings or TicketCategory
  return null;
}
