import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { ModerationService } from '../../services/moderation.js';
import { LoggingService } from '../../services/logging.js';

const DURATION_CHOICES = [
  { name: '60 seconds', value: 60 },
  { name: '5 minutes', value: 300 },
  { name: '10 minutes', value: 600 },
  { name: '1 hour', value: 3600 },
  { name: '1 day', value: 86400 },
  { name: '1 week', value: 604800 },
];

export default new Command({
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('Member to timeout').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('duration')
        .setDescription('Timeout duration')
        .setRequired(true)
        .addChoices(...DURATION_CHOICES)
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction) {
    const target = interaction.options.getMember('member') as GuildMember | null;
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target || !('timeout' in target)) {
      await interaction.reply({ content: '❌ Invalid member.', ephemeral: true });
      return;
    }

    const moderator = interaction.member as GuildMember;

    // Permission check
    if (!ModerationService.canModerate(moderator, target)) {
      await interaction.reply({
        content: '❌ Cannot timeout this member (role hierarchy).',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const result = await ModerationService.timeout(target, moderator, duration * 1000, reason);

    if (!result.success) {
      await interaction.editReply(`❌ Failed: ${result.error}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('⏱️ Member Timed Out')
      .addFields(
        { name: 'Member', value: `${target.user.tag}`, inline: true },
        { name: 'Duration', value: `${duration}s`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send to modlog channel
    await LoggingService.sendModLog(interaction.guild!, embed);
  },
});
