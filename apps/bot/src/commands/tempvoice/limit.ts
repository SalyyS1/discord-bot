import { SlashCommandBuilder, VoiceChannel, GuildMember } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TempVoiceModule } from '../../modules/tempvoice/index.js';
import { TempVoicePermissions } from '../../modules/tempvoice/permissions.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('limit')
    .setDescription('Set user limit for your temp voice channel')
    .addIntegerOption((opt) =>
      opt
        .setName('limit')
        .setDescription('User limit (0 = unlimited)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(99)
    ),

  async execute(interaction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice?.channel as VoiceChannel | null;
    const limit = interaction.options.getInteger('limit', true);

    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ You must be in a voice channel.',
        ephemeral: true,
      });
      return;
    }

    const isOwner = await TempVoiceModule.isOwner(voiceChannel.id, member.id);
    if (!isOwner) {
      await interaction.reply({
        content: '❌ You are not the owner of this channel.',
        ephemeral: true,
      });
      return;
    }

    try {
      await TempVoicePermissions.setLimit(voiceChannel, limit);
      await interaction.reply({
        content:
          limit === 0
            ? '✅ User limit removed (unlimited).'
            : `✅ User limit set to **${limit}** users.`,
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: '❌ Failed to set user limit.',
        ephemeral: true,
      });
    }
  },
});
