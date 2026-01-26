import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { StickyMessageModule } from '../../modules/utility/stickyMessage.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Manage sticky messages')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set a sticky message')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Message content')
            .setRequired(true)
            .setMaxLength(2000)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('Remove sticky message from channel')
    )
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('View current sticky message')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.channel as TextChannel;

    switch (subcommand) {
      case 'set': {
        const message = interaction.options.getString('message', true);

        await interaction.deferReply({ ephemeral: true });

        try {
          await StickyMessageModule.setSticky(channel, message);
          await interaction.editReply(
            '✅ Sticky message set! It will stay at the bottom of this channel.'
          );
        } catch {
          await interaction.editReply('❌ Failed to set sticky message.');
        }
        break;
      }

      case 'remove': {
        await interaction.deferReply({ ephemeral: true });

        const removed = await StickyMessageModule.removeSticky(channel);

        if (removed) {
          await interaction.editReply('✅ Sticky message removed.');
        } else {
          await interaction.editReply(
            '❌ No sticky message found in this channel.'
          );
        }
        break;
      }

      case 'view': {
        const sticky = await StickyMessageModule.getSticky(channel.id);

        if (!sticky) {
          await interaction.reply({
            content: '❌ No sticky message set in this channel.',
            ephemeral: true,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('📌 Sticky Message')
          .setDescription(sticky.content || '(Embed only)')
          .addFields({
            name: 'Has Embed',
            value: sticky.embedJson ? 'Yes' : 'No',
            inline: true,
          });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
});
