import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { AutoResponderModule } from '../../modules/autoresponder/index.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('autoresponder-remove')
    .setDescription('Remove an auto-responder trigger')
    .addStringOption((opt) =>
      opt
        .setName('id')
        .setDescription('Trigger ID (use /autoresponder-list to find)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction) {
    const id = interaction.options.getString('id', true);

    const success = await AutoResponderModule.remove(id);

    if (success) {
      await interaction.reply({
        content: `✅ Auto-responder \`${id.slice(0, 8)}\` has been removed.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: '❌ Auto-responder not found.',
        ephemeral: true,
      });
    }
  },
});
