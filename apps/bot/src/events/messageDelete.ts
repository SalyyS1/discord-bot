import { Events, EmbedBuilder, Message, PartialMessage } from 'discord.js';
import { Event } from '../structures/Event.js';
import { LoggingService } from '../services/logging.js';

export default new Event({
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage) {
    // Ignore DMs and bot messages
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setColor(0xff6b6b)
      .setTitle('🗑️ Message Deleted')
      .addFields(
        { name: 'Author', value: message.author?.tag ?? 'Unknown', inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }
      )
      .setTimestamp();

    if (message.content) {
      embed.addFields({
        name: 'Content',
        value: message.content.slice(0, 1024) || 'No content',
      });
    }

    if (message.attachments.size > 0) {
      embed.addFields({
        name: 'Attachments',
        value: message.attachments.map((a) => a.name).join(', '),
      });
    }

    await LoggingService.sendLog(message.guild, embed);
  },
});
