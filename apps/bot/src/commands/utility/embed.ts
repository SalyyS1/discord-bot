import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { EmbedBuilderModule } from '../../modules/utility/embedBuilder.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message')
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to send embed (default: current)')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],
  async execute(interaction) {
    // Show the embed builder modal
    await EmbedBuilderModule.showModal(interaction);
  },
});
