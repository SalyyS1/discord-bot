import { SlashCommandBuilder, PermissionFlagsBits, TextChannel, GuildMember } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TicketModule } from '../../modules/tickets/index.js';
import { prisma } from '../../lib/prisma.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for closing').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  permissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction) {
    const channel = interaction.channel as TextChannel;
    const member = interaction.member as GuildMember;

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

    await interaction.deferReply();

    const transcriptUrl = await TicketModule.close(channel, member);

    if (!transcriptUrl) {
      await interaction.editReply('❌ Failed to close ticket.');
      return;
    }

    // The close function sends its own message, so we don't need to reply
  },
});
