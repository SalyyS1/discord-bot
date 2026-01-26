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
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('Member to kick').setRequired(true)
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  permissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  async execute(interaction) {
    const target = interaction.options.getMember('member') as GuildMember | null;
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target || !('kick' in target)) {
      await interaction.reply({ content: '❌ Invalid member.', ephemeral: true });
      return;
    }

    const moderator = interaction.member as GuildMember;

    if (!ModerationService.canModerate(moderator, target)) {
      await interaction.reply({
        content: '❌ Cannot kick this member (role hierarchy).',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const result = await ModerationService.kick(target, moderator, reason);

    if (!result.success) {
      await interaction.editReply(`❌ Failed: ${result.error}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('👢 Member Kicked')
      .addFields(
        { name: 'Member', value: `${target.user.tag}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await LoggingService.sendModLog(interaction.guild!, embed);
  },
});
