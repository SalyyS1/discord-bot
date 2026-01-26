import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../structures/Command.js';

export default new Command({
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  cooldown: 5,
  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong!\n` + `Latency: **${latency}ms**\n` + `API Latency: **${apiLatency}ms**`
    );
  },
});
