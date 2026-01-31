/**
 * /seek command - Jump to a specific position
 */

import { SlashCommandBuilder, GuildMember, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { Command } from '../../structures/Command.js';
import { hasDJRole, formatDuration } from '../../modules/music/index.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Jump to a specific position in the track')
        .addStringOption((opt) =>
            opt
                .setName('position')
                .setDescription('Position (e.g., 1:30, 90, 2:15:30)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const member = interaction.member as GuildMember;
        const positionStr = interaction.options.getString('position', true);

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue?.currentTrack) {
            await interaction.reply({ content: '❌ No music is playing.', ephemeral: true });
            return;
        }

        // Parse position (supports: 90, 1:30, 2:15:30)
        const parts = positionStr.split(':').map(Number);
        let seconds = 0;

        if (parts.length === 1) {
            seconds = parts[0];
        } else if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        if (isNaN(seconds) || seconds < 0) {
            await interaction.reply({
                content: '❌ Invalid position format. Use formats like: `90`, `1:30`, `2:15:30`',
                ephemeral: true,
            });
            return;
        }

        const durationMs = queue.currentTrack.durationMS || 0;
        if (seconds * 1000 > durationMs) {
            await interaction.reply({
                content: `❌ Position exceeds track duration (${queue.currentTrack.duration})`,
                ephemeral: true,
            });
            return;
        }

        await queue.node.seek(seconds * 1000);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setDescription(`⏩ Jumped to **${formatDuration(seconds)}**`)
            ],
        });
    },
});
