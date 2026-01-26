import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  CategoryChannel,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TicketModule } from '../../modules/tickets/index.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Setup the ticket system')
    .addChannelOption((opt) =>
      opt
        .setName('panel-channel')
        .setDescription('Channel to send the ticket creation panel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('category')
        .setDescription('Category where tickets will be created')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('title')
        .setDescription('Panel title')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('description')
        .setDescription('Panel description')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction) {
    const panelChannel = interaction.options.getChannel('panel-channel', true) as TextChannel;
    const category = interaction.options.getChannel('category', true) as CategoryChannel;
    const title = interaction.options.getString('title') ?? 'Support Tickets';
    const description =
      interaction.options.getString('description') ??
      'Click the button below to create a support ticket.';

    await interaction.deferReply({ ephemeral: true });

    try {
      await TicketModule.setupPanel(panelChannel, category.id, title, description);

      await interaction.editReply(
        `✅ **Ticket System Setup Complete**\n\n` +
          `• Panel: ${panelChannel}\n` +
          `• Category: ${category.name}\n\n` +
          `Users can now create tickets by clicking the button in ${panelChannel}.`
      );
    } catch {
      await interaction.editReply('❌ Failed to setup ticket system.');
    }
  },
});
