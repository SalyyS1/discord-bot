import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { LoggingService } from '../../services/logging.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages')
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Only delete from this user')
    )
    .addStringOption((opt) =>
      opt.setName('contains').setDescription('Only delete containing this text')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains');

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel as TextChannel;
    let messages = await channel.messages.fetch({ limit: amount });

    // Filter by user if specified
    if (user) {
      messages = messages.filter((m) => m.author.id === user.id);
    }

    // Filter by content if specified
    if (contains) {
      messages = messages.filter((m) =>
        m.content.toLowerCase().includes(contains.toLowerCase())
      );
    }

    // Filter out messages older than 14 days
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter((m) => m.createdTimestamp > twoWeeksAgo);

    if (messages.size === 0) {
      await interaction.editReply('❌ No messages found to delete.');
      return;
    }

    // Bulk delete
    const deleted = await channel.bulkDelete(messages, true);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🗑️ Messages Purged')
      .addFields(
        { name: 'Deleted', value: `${deleted.size} messages`, inline: true },
        { name: 'Channel', value: `${channel.name}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await LoggingService.sendModLog(interaction.guild!, embed);
  },
});
