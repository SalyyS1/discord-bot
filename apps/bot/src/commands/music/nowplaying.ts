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
import { generateMusicEmbed } from '../../services/music-embed-generator.js';

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

        // Use platform-specific embed
        const embed = generateMusicEmbed(track, queue);

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
