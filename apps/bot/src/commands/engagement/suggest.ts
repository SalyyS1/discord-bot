import { SlashCommandBuilder, TextChannel } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { prisma } from '../../lib/prisma.js';
import { SuggestionsModule } from '../../modules/suggestions/index.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption((opt) =>
      opt
        .setName('suggestion')
        .setDescription('Your suggestion')
        .setRequired(true)
        .setMaxLength(2000)
    ),
  cooldown: 60, // 1 minute cooldown
  async execute(interaction) {
    const suggestion = interaction.options.getString('suggestion', true);

    // Get guild settings
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guild!.id },
    });

    if (!settings?.suggestionsChannelId) {
      await interaction.reply({
        content:
          '❌ Suggestions channel not configured. Ask an admin to set it up.',
        ephemeral: true,
      });
      return;
    }

    // Fetch suggestions channel
    const channel = await interaction.guild!.channels.fetch(
      settings.suggestionsChannelId
    );
    if (!channel?.isTextBased()) {
      await interaction.reply({
        content: '❌ Suggestions channel not found or invalid.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await SuggestionsModule.create(
        channel as TextChannel,
        interaction.user,
        suggestion
      );

      await interaction.editReply(
        '✅ Your suggestion has been submitted! Others can now vote on it.'
      );
    } catch (error) {
      await interaction.editReply(
        '❌ Failed to submit suggestion. Please try again.'
      );
    }
  },
});
