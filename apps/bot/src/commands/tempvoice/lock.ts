import { SlashCommandBuilder, VoiceChannel, GuildMember } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TempVoiceModule } from '../../modules/tempvoice/index.js';
import { TempVoicePermissions } from '../../modules/tempvoice/permissions.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock your temp voice channel'),

  async execute(interaction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice?.channel as VoiceChannel | null;

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
      await TempVoicePermissions.lock(voiceChannel);
      await interaction.reply({
        content: '🔒 Your channel has been locked.',
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: '❌ Failed to lock the channel.',
        ephemeral: true,
      });
    }
  },
});
