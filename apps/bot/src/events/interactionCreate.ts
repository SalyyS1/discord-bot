import {
  Events,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  ModalSubmitInteraction,
  EmbedBuilder,
  TextChannel,
  GuildMember,
} from 'discord.js';
import { Event } from '../structures/Event.js';
import { client } from '../lib/client.js';
import { handleCommandError } from '../handlers/errorHandler.js';
import { checkCooldown } from '../utils/cooldown.js';
import { getCommandsByCategory } from '../handlers/commandHandler.js';
import { VerificationModule } from '../modules/security/verification.js';
import { ButtonRolesModule } from '../modules/utility/buttonRoles.js';
import { SuggestionsModule } from '../modules/suggestions/index.js';
import { EmbedBuilderModule } from '../modules/utility/embedBuilder.js';
import { TicketModule } from '../modules/tickets/index.js';
import { TicketV2Module } from '../modules/tickets/ticketV2.js';
import { RatingService } from '../modules/tickets/rating.js';
import { GiveawayModule } from '../modules/giveaway/index.js';
import { VoiceButtonHandler } from '../modules/tempvoice/buttonHandler.js';
import { MusicButtonHandler } from '../modules/music/buttonHandler.js';
import { logger } from '../utils/logger.js';

export default new Event({
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
      return;
    }

    if (interaction.isUserSelectMenu()) {
      await handleUserSelectMenu(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
      return;
    }
  },
});

async function handleCommand(interaction: ChatInputCommandInteraction) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  const { onCooldown, remaining } = checkCooldown(
    command.data.name,
    interaction.user.id,
    command.cooldown
  );

  if (onCooldown) {
    await interaction.reply({
      content: `⏳ Please wait ${remaining.toFixed(1)}s before using this command again.`,
      ephemeral: true,
    });
    return;
  }

  if (command.permissions.length > 0 && interaction.guild) {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(command.permissions)) {
      await interaction.reply({
        content: '❌ You lack permissions to use this command.',
        ephemeral: true,
      });
      return;
    }
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    await handleCommandError(interaction, error as Error);
  }
}

async function handleButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  logger.debug(`Button clicked: ${customId}`);

  try {
    // Handle voice control panel buttons
    if (await VoiceButtonHandler.handle(interaction)) {
      return;
    }

    // Handle music control panel buttons
    if (await MusicButtonHandler.handle(interaction)) {
      return;
    }

    // Handle verification button
    if (customId === 'verify_button') {
      await VerificationModule.handleVerification(interaction);
      return;
    }

    // Handle button roles
    if (customId.startsWith('buttonrole_')) {
      await ButtonRolesModule.handleButtonClick(interaction);
      return;
    }

    // Handle suggestion votes
    if (customId === 'suggest_upvote') {
      await SuggestionsModule.handleVote(interaction, true);
      return;
    }
    if (customId === 'suggest_downvote') {
      await SuggestionsModule.handleVote(interaction, false);
      return;
    }

    // Handle ticket buttons
    if (customId === 'ticket_create') {
      await TicketModule.handleCreate(interaction);
      return;
    }
    if (customId === 'ticket_claim') {
      await TicketModule.claim(interaction, interaction.member as GuildMember);
      return;
    }
    if (customId === 'ticket_close') {
      const channel = interaction.channel as TextChannel;
      await interaction.deferReply();
      await TicketModule.close(channel, interaction.member as GuildMember);
      return;
    }
    if (customId === 'ticket_reopen') {
      await TicketModule.reopen(interaction);
      return;
    }

    // Handle ticket rating buttons (1-5 stars)
    if (customId.startsWith('ticket_rate_')) {
      await TicketModule.handleRating(interaction);
      return;
    }

    // Handle ticket form continue button (multi-step form)
    if (customId.startsWith('ticket_form_continue_')) {
      await TicketModule.handleFormContinue(interaction);
      return;
    }

    // Handle ticket v2 category buttons
    if (customId.startsWith('ticket_category:')) {
      await TicketV2Module.handleCategoryButton(interaction);
      return;
    }

    // Handle legacy rating buttons
    if (customId.startsWith('rate_')) {
      await RatingService.handleRating(interaction);
      return;
    }
    if (customId.startsWith('review_')) {
      await RatingService.handleReviewButton(interaction);
      return;
    }

    // Handle rating channel buttons (re-rate and reopen)
    if (customId.startsWith('rating_rerate_')) {
      await TicketModule.handleRerateButton(interaction);
      return;
    }
    if (customId.startsWith('rating_reopen_')) {
      await TicketModule.handleReopenFromRatingButton(interaction);
      return;
    }
    if (customId.startsWith('rerate_')) {
      await TicketModule.handleRerateSelect(interaction);
      return;
    }

    // Handle giveaway entry
    if (customId === 'giveaway_enter') {
      await GiveawayModule.handleEntry(interaction);
      return;
    }
  } catch (error) {
    logger.error(`Button handler error (${customId}):`, error);

    // Try to reply with error if not already replied
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true,
        });
      }
    } catch {
      // Ignore reply errors
    }
  }
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  try {
    // Handle voice select menus
    if (await VoiceButtonHandler.handleSelect(interaction)) {
      return;
    }

    const [action] = interaction.customId.split('_');
    logger.debug(`Select menu: ${action} - ${interaction.values[0]}`);

    if (action === 'help' && interaction.customId === 'help_category') {
      const category = interaction.values[0];
      const categories = getCommandsByCategory();
      const commands = categories.get(category);

      if (!commands) {
        await interaction.reply({ content: 'Category not found', ephemeral: true });
        return;
      }

      const categoryEmojis: Record<string, string> = {
        moderation: '🛡️',
        utility: '🔧',
        automation: '⚙️',
        engagement: '🎮',
        tickets: '🎫',
        giveaway: '🎉',
        studio: '🎨',
      };

      const emoji = categoryEmojis[category] ?? '📁';
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
        .setDescription(
          commands
            .map((cmd) => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
            .join('\n')
        )
        .setFooter({ text: `${commands.length} commands in this category` });

      await interaction.update({ embeds: [embed] });
    }

    // Handle ticket product select (legacy)
    if (interaction.customId === 'ticket_product_select') {
      await TicketModule.handleProductSelect(interaction);
      return;
    }

    // Handle ticket category select (enhanced)
    if (interaction.customId === 'ticket_category_select') {
      await TicketModule.handleCategorySelect(interaction);
      return;
    }

    // Handle ticket form select (multi-step form)
    if (interaction.customId.startsWith('ticket_form_select_')) {
      await TicketModule.handleFormSelect(interaction);
      return;
    }

    // Handle ticket v2 category select
    if (interaction.customId === 'ticket_v2_category_select') {
      await TicketV2Module.handleCategorySelect(interaction);
      return;
    }
  } catch (error) {
    logger.error('SelectMenu handler error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your selection.',
          ephemeral: true,
        });
      }
    } catch {
      // Ignore reply errors
    }
  }
}

async function handleUserSelectMenu(interaction: UserSelectMenuInteraction) {
  try {
    const customId = interaction.customId;
    logger.debug(`User select menu: ${customId} - ${interaction.values[0]}`);

    // Handle voice user select menus (permit/block user)
    if (await VoiceButtonHandler.handleSelect(interaction)) {
      return;
    }

    // Add more user select menu handlers here as needed
  } catch (error) {
    logger.error('UserSelectMenu handler error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your selection.',
          ephemeral: true,
        });
      }
    } catch {
      // Ignore reply errors
    }
  }
}

async function handleModal(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;
  logger.debug(`Modal submitted: ${customId}`);

  try {
    // Handle voice modals
    if (await VoiceButtonHandler.handleModal(interaction)) {
      return;
    }

    // Handle embed builder modal
    if (customId === 'embed_builder') {
      try {
        const embed = await EmbedBuilderModule.processModal(interaction);

        // Send embed to channel
        const channel = interaction.channel as TextChannel;
        await channel.send({ embeds: [embed] });

        await interaction.reply({
          content: '✅ Embed sent successfully!',
          ephemeral: true,
        });
      } catch (error) {
        logger.error('Embed builder error:', error);
        await interaction.reply({
          content: '❌ Failed to create embed.',
          ephemeral: true,
        });
      }
      return;
    }

    // Handle ticket modals (legacy)
    if (customId.startsWith('ticket_modal_')) {
      await TicketModule.handleModal(interaction);
      return;
    }

    // Handle ticket v2 form modals
    if (customId.startsWith('ticket_form_')) {
      await TicketV2Module.handleFormModal(interaction);
      return;
    }

    // Handle ticket review modal (enhanced)
    if (customId.startsWith('ticket_review_')) {
      await TicketModule.handleReviewModal(interaction);
      return;
    }

    // Handle re-rate modal
    if (customId.startsWith('rerate_modal_')) {
      await TicketModule.handleRerateModal(interaction);
      return;
    }

    // Handle reopen reason modal
    if (customId.startsWith('reopen_reason_')) {
      await TicketModule.handleReopenReasonModal(interaction);
      return;
    }

    // Handle legacy review modal
    if (customId.startsWith('review_modal_')) {
      await RatingService.handleReviewModal(interaction);
      return;
    }
  } catch (error) {
    logger.error('Modal handler error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your submission.',
          ephemeral: true,
        });
      }
    } catch {
      // Ignore reply errors
    }
  }
}
