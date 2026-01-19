import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { getCommandsByCategory } from '../../handlers/commandHandler.js';

const categoryEmojis: Record<string, string> = {
  moderation: '🛡️',
  utility: '🔧',
  automation: '⚙️',
  engagement: '🎮',
  tickets: '🎫',
  giveaway: '🎉',
  studio: '🎨',
};

export default new Command({
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse bot commands')
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('Get help for a specific command')
        .setRequired(false)
    ) as SlashCommandBuilder,
  cooldown: 3,
  async execute(interaction) {
    const commandName = interaction.options.getString('command');

    if (commandName) {
      const command = interaction.client.commands.get(commandName);
      if (!command) {
        await interaction.reply({
          content: `❌ Command \`${commandName}\` not found.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📖 /${command.data.name}`)
        .setDescription(command.data.description)
        .addFields(
          { name: 'Category', value: command.category, inline: true },
          { name: 'Cooldown', value: `${command.cooldown}s`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const categories = getCommandsByCategory();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📚 Help Menu')
      .setDescription('Select a category below to view commands.')
      .setFooter({ text: `${interaction.client.commands.size} total commands` });

    const options: StringSelectMenuOptionBuilder[] = [];
    for (const [category, commands] of categories) {
      const emoji = categoryEmojis[category] ?? '📁';
      options.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(category.charAt(0).toUpperCase() + category.slice(1))
          .setDescription(`${commands.length} commands`)
          .setValue(category)
          .setEmoji(emoji)
      );
    }

    if (options.length === 0) {
      await interaction.reply({
        content: 'No commands available.',
        ephemeral: true,
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
});
