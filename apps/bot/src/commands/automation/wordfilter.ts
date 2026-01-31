import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { WordFilterModule } from '../../modules/security/wordFilter.js';
import { prisma } from '../../lib/prisma.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('wordfilter')
    .setDescription('Configure word filter for the server')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a word to the filter (supports wildcards: * and ?)')
        .addStringOption((opt) =>
          opt
            .setName('word')
            .setDescription('Word to filter (use * for any chars, ? for single char)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a word from the filter')
        .addStringOption((opt) =>
          opt
            .setName('word')
            .setDescription('Word to remove')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all filtered words')
    )
    .addSubcommand((sub) =>
      sub
        .setName('action')
        .setDescription('Set the action when filtered word is detected')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Action to take')
            .setRequired(true)
            .addChoices(
              { name: 'Delete message only', value: 'DELETE' },
              { name: 'Delete + Warn', value: 'WARN' },
              { name: 'Delete + Timeout (5 min)', value: 'TIMEOUT' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable word filter')
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable word filter')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show word filter status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;
    const guildName = interaction.guild!.name;

    switch (subcommand) {
      case 'add': {
        const word = interaction.options.getString('word', true);
        const added = await WordFilterModule.addWord(guildId, guildName, word);

        if (!added) {
          await interaction.reply({
            content: `❌ \`${word}\` is already in the filter list.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.reply(`✅ Added \`${word}\` to the word filter.`);
        break;
      }

      case 'remove': {
        const word = interaction.options.getString('word', true);
        const removed = await WordFilterModule.removeWord(guildId, word);

        if (!removed) {
          await interaction.reply({
            content: `❌ \`${word}\` is not in the filter list.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.reply(`✅ Removed \`${word}\` from the word filter.`);
        break;
      }

      case 'list': {
        const words = await WordFilterModule.getWords(guildId);

        if (words.length === 0) {
          await interaction.reply({
            content: 'No words in the filter list.',
            ephemeral: true,
          });
          return;
        }

        const wordList = words.map(w => `\`${w}\``).join(', ');
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🚫 Filtered Words')
          .setDescription(wordList)
          .setFooter({ text: `${words.length} word(s) • Use * for wildcard, ? for single char` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'action': {
        const action = interaction.options.getString('type', true) as 'DELETE' | 'WARN' | 'TIMEOUT';
        await WordFilterModule.setAction(guildId, guildName, action);

        const actionLabels: Record<string, string> = {
          DELETE: 'Delete message only',
          WARN: 'Delete message + Warn user',
          TIMEOUT: 'Delete message + 5 minute timeout',
        };

        await interaction.reply(`✅ Word filter action set to: **${actionLabels[action]}**`);
        break;
      }

      case 'enable': {
        await WordFilterModule.setEnabled(guildId, guildName, true);
        await interaction.reply('✅ Word filter enabled. Messages with filtered words will be moderated.');
        break;
      }

      case 'disable': {
        await WordFilterModule.setEnabled(guildId, guildName, false);
        await interaction.reply('✅ Word filter disabled.');
        break;
      }

      case 'status': {
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId },
        });

        const embed = new EmbedBuilder()
          .setColor(settings?.wordFilterEnabled ? 0x00ff00 : 0xff0000)
          .setTitle('🚫 Word Filter Status')
          .addFields(
            {
              name: 'Status',
              value: settings?.wordFilterEnabled ? '✅ Enabled' : '❌ Disabled',
              inline: true,
            },
            {
              name: 'Action',
              value: settings?.wordFilterAction || 'DELETE',
              inline: true,
            },
            {
              name: 'Words',
              value: `${settings?.filteredWords?.length || 0} filtered`,
              inline: true,
            }
          );

        if (settings?.wordFilterEnabled) {
          embed.setDescription('Messages containing filtered words will be automatically moderated.');
        }

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
});
