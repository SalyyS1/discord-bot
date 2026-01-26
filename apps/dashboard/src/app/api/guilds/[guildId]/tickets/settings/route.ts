import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Default message configs
const DEFAULT_MESSAGE_CONFIGS = {
  welcome: {
    enabled: true,
    content: '{user}',
    embed: {
      enabled: true,
      title: '🎫 Ticket Created',
      description: 'Hello {user}, thank you for creating a ticket!\n\nA staff member will be with you shortly. Please describe your issue in detail.',
      color: '#5865F2',
      timestamp: true,
      footer: 'Ticket #{ticket}',
    },
  },
  claim: {
    enabled: true,
    embed: {
      enabled: true,
      title: '✋ Ticket Claimed',
      description: '**{staff}** has claimed this ticket.\n\n{user}, a staff member is now assisting you. Please provide any additional information needed.',
      color: '#57F287',
      timestamp: true,
    },
  },
  close: {
    enabled: true,
    embed: {
      enabled: true,
      title: '🔒 Ticket Closed',
      description: 'This ticket has been closed by {staff}.\n\n{reason}',
      color: '#ED4245',
      timestamp: true,
      footer: 'Thank you for using our support system',
    },
  },
  thankYou: {
    enabled: true,
    embed: {
      enabled: true,
      title: '💖 Thank You!',
      description: 'Thank you for contacting support!\n\nWe hope we were able to help you. If you have any more questions, feel free to open a new ticket.',
      color: '#EB459E',
      timestamp: true,
    },
  },
  ratingReview: {
    enabled: true,
    embed: {
      enabled: true,
      title: '📝 New Ticket Review',
      description: '{review}',
      color: '#57F287',
      timestamp: true,
      fields: [
        { name: 'Rating', value: '{starsDisplay}', inline: true },
        { name: 'From', value: '{user}', inline: true },
        { name: 'Ticket', value: '{ticket}', inline: true },
        { name: 'Staff', value: '{staff}', inline: true },
      ],
    },
  },
};

// GET - Get ticket settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
      select: {
        ticketsEnabled: true,
        ticketCategoryId: true,
        ticketLogChannelId: true,
        ticketTranscriptChannelId: true,
        ticketMaxPerUser: true,
        ticketCooldownMinutes: true,
        ticketWelcomeMessage: true,
        ticketClaimMessage: true,
        ticketThankYouMessage: true,
        ticketReopenEnabled: true,
        ticketDeleteDelay: true,
        ratingChannelId: true,
        // Message configs (JSON)
        ticketWelcomeConfig: true,
        ticketClaimEmbedConfig: true,
        ticketCloseConfig: true,
        ticketThankYouEmbedConfig: true,
        ratingReviewConfig: true,
      },
    });

    if (!settings) {
      return ApiResponse.success({
        ticketsEnabled: true,
        defaultCategoryId: '',
        logChannelId: '',
        transcriptChannelId: '',
        ratingChannelId: '',
        maxPerUser: 3,
        cooldownMinutes: 5,
        welcomeMessage: 'Thank you for contacting support! A staff member will be with you shortly.',
        claimMessage: '{staff} has claimed this ticket.\n\n{user}, please provide any additional information needed.',
        thankYouMessage: 'Thank you for contacting support!\n\nWe hope we were able to help you. If you have any questions, feel free to open a new ticket.',
        reopenEnabled: true,
        deleteDelay: 0,
        messageConfigs: DEFAULT_MESSAGE_CONFIGS,
      });
    }

    // Merge saved configs with defaults
    const messageConfigs = {
      welcome: settings.ticketWelcomeConfig || DEFAULT_MESSAGE_CONFIGS.welcome,
      claim: settings.ticketClaimEmbedConfig || DEFAULT_MESSAGE_CONFIGS.claim,
      close: settings.ticketCloseConfig || DEFAULT_MESSAGE_CONFIGS.close,
      thankYou: settings.ticketThankYouEmbedConfig || DEFAULT_MESSAGE_CONFIGS.thankYou,
      ratingReview: settings.ratingReviewConfig || DEFAULT_MESSAGE_CONFIGS.ratingReview,
    };

    return ApiResponse.success({
      ticketsEnabled: settings.ticketsEnabled,
      defaultCategoryId: settings.ticketCategoryId || '',
      logChannelId: settings.ticketLogChannelId || '',
      transcriptChannelId: settings.ticketTranscriptChannelId || '',
      ratingChannelId: settings.ratingChannelId || '',
      maxPerUser: settings.ticketMaxPerUser,
      cooldownMinutes: settings.ticketCooldownMinutes,
      welcomeMessage: settings.ticketWelcomeMessage || 'Thank you for contacting support! A staff member will be with you shortly.',
      claimMessage: settings.ticketClaimMessage || '{staff} has claimed this ticket.\n\n{user}, please provide any additional information needed.',
      thankYouMessage: settings.ticketThankYouMessage || 'Thank you for contacting support!\n\nWe hope we were able to help you. If you have any questions, feel free to open a new ticket.',
      reopenEnabled: settings.ticketReopenEnabled ?? true,
      deleteDelay: settings.ticketDeleteDelay ?? 0,
      messageConfigs,
    });
  } catch (error) {
    logger.error(`Failed to fetch ticket settings: ${error}`);
    return ApiResponse.serverError();
  }
}

// PATCH - Update ticket settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const {
      ticketsEnabled,
      defaultCategoryId,
      logChannelId,
      transcriptChannelId,
      ratingChannelId,
      maxPerUser,
      cooldownMinutes,
      welcomeMessage,
      claimMessage,
      thankYouMessage,
      reopenEnabled,
      deleteDelay,
      messageConfigs,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (ticketsEnabled !== undefined) updateData.ticketsEnabled = ticketsEnabled;
    if (defaultCategoryId !== undefined) updateData.ticketCategoryId = defaultCategoryId || null;
    if (logChannelId !== undefined) updateData.ticketLogChannelId = logChannelId || null;
    if (transcriptChannelId !== undefined) updateData.ticketTranscriptChannelId = transcriptChannelId || null;
    if (ratingChannelId !== undefined) updateData.ratingChannelId = ratingChannelId || null;
    if (maxPerUser !== undefined) updateData.ticketMaxPerUser = maxPerUser;
    if (cooldownMinutes !== undefined) updateData.ticketCooldownMinutes = cooldownMinutes;
    if (welcomeMessage !== undefined) updateData.ticketWelcomeMessage = welcomeMessage || null;
    if (claimMessage !== undefined) updateData.ticketClaimMessage = claimMessage || null;
    if (thankYouMessage !== undefined) updateData.ticketThankYouMessage = thankYouMessage || null;
    if (reopenEnabled !== undefined) updateData.ticketReopenEnabled = reopenEnabled;
    if (deleteDelay !== undefined) updateData.ticketDeleteDelay = deleteDelay;

    // Message configs (rich embed configurations)
    if (messageConfigs) {
      if (messageConfigs.welcome) updateData.ticketWelcomeConfig = messageConfigs.welcome;
      if (messageConfigs.claim) updateData.ticketClaimEmbedConfig = messageConfigs.claim;
      if (messageConfigs.close) updateData.ticketCloseConfig = messageConfigs.close;
      if (messageConfigs.thankYou) updateData.ticketThankYouEmbedConfig = messageConfigs.thankYou;
      if (messageConfigs.ratingReview) updateData.ratingReviewConfig = messageConfigs.ratingReview;
    }

    await prisma.guildSettings.upsert({
      where: { guildId },
      create: {
        guildId,
        ...updateData,
      },
      update: updateData,
    });

    return ApiResponse.success({ updated: true });
  } catch (error) {
    logger.error(`Failed to update ticket settings: ${error}`);
    return ApiResponse.serverError();
  }
}
