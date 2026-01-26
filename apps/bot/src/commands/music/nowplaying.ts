/**
 * /nowplaying command - Show current track info
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { useQueue } from 'discord-player';
import { Command } from '../../structures/Command.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing track'),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId!);

        if (!queue || !queue.currentTrack) {
            await interaction.reply({
                content: '❌ No music is playing.',
                ephemeral: true,
            });
            return;
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar({
            length: 20,
            timecodes: true,
            queue: false,
        });

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**`)
            .setThumbnail(track.thumbnail)
            .addFields(
                { name: '👤 Artist', value: track.author, inline: true },
                { name: '⏱️ Duration', value: track.duration, inline: true },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '📊 Progress', value: progress || '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', inline: false }
            )
            .setFooter({
                text: `Requested by ${track.requestedBy?.username || 'Unknown'} • ${queue.tracks.size} songs in queue`,
            });

        // Control buttons
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_pause')
                .setEmoji(queue.node.isPaused() ? '▶️' : '⏸️')
                .setStyle(queue.node.isPaused() ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setEmoji('🔀')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
});
