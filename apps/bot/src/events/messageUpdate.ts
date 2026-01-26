import { Events, EmbedBuilder, Message, PartialMessage } from 'discord.js';
import { Event } from '../structures/Event.js';
import { LoggingService } from '../services/logging.js';

export default new Event({
  name: Events.MessageUpdate,
  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    // Ignore DMs, bots, and embeds-only updates
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('✏️ Message Edited')
      .addFields(
        { name: 'Author', value: newMessage.author?.tag ?? 'Unknown', inline: true },
        { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
        {
          name: 'Before',
          value: oldMessage.content?.slice(0, 1024) || 'No content',
        },
        {
          name: 'After',
          value: newMessage.content?.slice(0, 1024) || 'No content',
        }
      )
      .setTimestamp();

    await LoggingService.sendLog(newMessage.guild, embed);
  },
});
