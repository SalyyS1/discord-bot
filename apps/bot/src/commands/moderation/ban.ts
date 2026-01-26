import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { ModerationService } from '../../services/moderation.js';
import { LoggingService } from '../../services/logging.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((opt) => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for ban'))
    .addIntegerOption((opt) =>
      opt
        .setName('delete_messages')
        .setDescription('Delete message history (days)')
        .addChoices(
          { name: 'None', value: 0 },
          { name: '1 day', value: 1 },
          { name: '7 days', value: 7 }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_messages') ?? 0;

    const moderator = interaction.member as GuildMember;
    const target = interaction.guild!.members.cache.get(user.id);

    // If member is in server, check hierarchy
    if (target && !ModerationService.canModerate(moderator, target)) {
      await interaction.reply({
        content: '❌ Cannot ban this member (role hierarchy).',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const result = await ModerationService.ban(
      interaction.guild!,
      user.id,
      moderator,
      reason,
      deleteDays * 86400 // Convert days to seconds
    );

    if (!result.success) {
      await interaction.editReply(`❌ Failed: ${result.error}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🔨 User Banned')
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await LoggingService.sendModLog(interaction.guild!, embed);
  },
});
