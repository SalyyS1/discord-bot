/**
 * /queue command - Show the music queue
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { Command } from '../../structures/Command.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the music queue')
        .addIntegerOption((opt) =>
            opt
                .setName('page')
                .setDescription('Page number')
                .setMinValue(1)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId!);

        if (!queue || !queue.currentTrack) {
            await interaction.reply({
                content: '❌ No music is playing.',
                ephemeral: true,
            });
            return;
        }

        const tracks = queue.tracks.toArray();
        const page = (interaction.options.getInteger('page') || 1) - 1;
        const pageSize = 10;
        const maxPages = Math.ceil(tracks.length / pageSize) || 1;

        if (page >= maxPages) {
            await interaction.reply({
                content: `❌ Invalid page. Max page is ${maxPages}.`,
                ephemeral: true,
            });
            return;
        }

        const currentTrack = queue.currentTrack;
        const pageTracks = tracks.slice(page * pageSize, (page + 1) * pageSize);

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎵 Music Queue')
            .setDescription(
                `**Now Playing:**\n` +
                `[${currentTrack.title}](${currentTrack.url}) - \`${currentTrack.duration}\`\n` +
                `Requested by ${currentTrack.requestedBy?.username || 'Unknown'}\n\n` +
                (tracks.length === 0
                    ? '*Queue is empty*'
                    : `**Up Next:**\n${pageTracks
                        .map(
                            (track, i) =>
                                `\`${page * pageSize + i + 1}.\` [${track.title.slice(0, 40)}](${track.url}) - \`${track.duration}\``
                        )
                        .join('\n')}`)
            )
            .setThumbnail(currentTrack.thumbnail)
            .setFooter({
                text: `Page ${page + 1}/${maxPages} • ${tracks.length} songs in queue • Volume: ${queue.node.volume}%`,
            });

        await interaction.reply({ embeds: [embed] });
    },
});
