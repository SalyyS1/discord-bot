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
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('Member to warn').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for warning').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('severity')
        .setDescription('Warning severity (1-3)')
        .addChoices(
          { name: 'Minor (1)', value: 1 },
          { name: 'Moderate (2)', value: 2 },
          { name: 'Severe (3)', value: 3 }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  permissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction) {
    const target = interaction.options.getMember('member') as GuildMember | null;
    const reason = interaction.options.getString('reason', true);
    const severity = interaction.options.getInteger('severity') ?? 1;

    if (!target || !('timeout' in target)) {
      await interaction.reply({ content: '❌ Invalid member.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const result = await ModerationService.warn(
      target,
      interaction.member as GuildMember,
      reason,
      severity
    );

    if (!result.success) {
      await interaction.editReply('❌ Failed to issue warning.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setTitle('⚠️ Warning Issued')
      .addFields(
        { name: 'Member', value: `${target.user.tag}`, inline: true },
        { name: 'Warnings', value: `${result.warningCount}`, inline: true },
        { name: 'Severity', value: `${severity}/3`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    // Add escalation info
    if (result.action) {
      const actionText =
        result.action === 'kick'
          ? '👢 Auto-kicked (5+ warnings)'
          : result.action === 'timeout_24h'
            ? '⏱️ Auto-timeout 24h (4 warnings)'
            : '⏱️ Auto-timeout 1h (3 warnings)';
      embed.addFields({ name: 'Auto-Action', value: actionText });
    }

    await interaction.editReply({ embeds: [embed] });
    await LoggingService.sendModLog(interaction.guild!, embed);

    // DM the member
    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle(`⚠️ You've been warned in ${interaction.guild!.name}`)
            .addFields({ name: 'Reason', value: reason })
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs disabled
    }
  },
});
