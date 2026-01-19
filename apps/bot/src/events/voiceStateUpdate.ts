import { Events, EmbedBuilder, VoiceState } from 'discord.js';
import { Event } from '../structures/Event.js';
import { LoggingService } from '../services/logging.js';
import { TempVoiceModule } from '../modules/tempvoice/index.js';

export default new Event({
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    if (!newState.guild) return;

    // Handle temp voice channels (create/cleanup)
    await TempVoiceModule.handleVoiceUpdate(oldState, newState).catch(() => {});

    let embed: EmbedBuilder | null = null;

    // Joined voice channel
    if (!oldState.channel && newState.channel) {
      embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔊 Voice Channel Joined')
        .addFields(
          { name: 'User', value: `${newState.member?.user.tag}`, inline: true },
          { name: 'Channel', value: `${newState.channel.name}`, inline: true }
        )
        .setTimestamp();
    }

    // Left voice channel
    if (oldState.channel && !newState.channel) {
      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔇 Voice Channel Left')
        .addFields(
          { name: 'User', value: `${oldState.member?.user.tag}`, inline: true },
          { name: 'Channel', value: `${oldState.channel.name}`, inline: true }
        )
        .setTimestamp();
    }

    // Moved between channels
    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('🔀 Voice Channel Switched')
        .addFields(
          { name: 'User', value: `${newState.member?.user.tag}`, inline: true },
          { name: 'From', value: `${oldState.channel.name}`, inline: true },
          { name: 'To', value: `${newState.channel.name}`, inline: true }
        )
        .setTimestamp();
    }

    if (embed) {
      await LoggingService.sendLog(newState.guild, embed);
    }
  },
});
