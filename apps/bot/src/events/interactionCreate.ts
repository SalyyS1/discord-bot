import {
  Events,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
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
import { GiveawayModule } from '../modules/giveaway/index.js';
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

  // Handle giveaway entry
  if (customId === 'giveaway_enter') {
    await GiveawayModule.handleEntry(interaction);
    return;
  }
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
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
}

async function handleModal(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;
  logger.debug(`Modal submitted: ${customId}`);

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
}
