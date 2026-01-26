import { SlashCommandBuilder, VoiceChannel, GuildMember } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TempVoiceModule } from '../../modules/tempvoice/index.js';
import { TempVoicePermissions } from '../../modules/tempvoice/permissions.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename your temp voice channel')
    .addStringOption((opt) =>
      opt
        .setName('name')
        .setDescription('New channel name')
        .setRequired(true)
        .setMaxLength(100)
    ),

  async execute(interaction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice?.channel as VoiceChannel | null;
    const newName = interaction.options.getString('name', true);

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
      await TempVoicePermissions.rename(voiceChannel, newName);
      await interaction.reply({
        content: `✅ Channel renamed to **${newName}**.`,
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: '❌ Failed to rename the channel.',
        ephemeral: true,
      });
    }
  },
});
