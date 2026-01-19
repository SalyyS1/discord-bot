import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TicketModule } from '../../modules/tickets/index.js';
import { prisma } from '../../lib/prisma.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('ticket-remove')
    .setDescription('Remove a user from the current ticket')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to remove').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  permissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction) {
    const channel = interaction.channel as TextChannel;
    const user = interaction.options.getUser('user', true);

    // Verify this is a ticket channel
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: channel.id },
    });

    if (!ticket) {
      await interaction.reply({
        content: '❌ This command can only be used in ticket channels.',
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({
        content: '❌ User not found in this server.',
        ephemeral: true,
      });
      return;
    }

    try {
      await TicketModule.removeUser(channel, member);
      await interaction.reply(`✅ ${user} has been removed from this ticket.`);
    } catch {
      await interaction.reply({
        content: '❌ Failed to remove user from ticket.',
        ephemeral: true,
      });
    }
  },
});
