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
    .setName('unban')
    .setDescription('Unban a user')
    .addStringOption((opt) =>
      opt.setName('user_id').setDescription('User ID to unban').setRequired(true)
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    await interaction.deferReply();

    const result = await ModerationService.unban(
      interaction.guild!,
      userId,
      interaction.member as GuildMember,
      reason
    );

    if (!result.success) {
      await interaction.editReply(`❌ Failed: ${result.error}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ User Unbanned')
      .addFields(
        { name: 'User ID', value: userId, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await LoggingService.sendModLog(interaction.guild!, embed);
  },
});
