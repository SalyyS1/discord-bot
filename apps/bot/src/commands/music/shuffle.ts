/**
 * /shuffle and /loop commands
 */

import { SlashCommandBuilder, GuildMember, EmbedBuilder } from 'discord.js';
import { useQueue, QueueRepeatMode } from 'discord-player';
import { Command } from '../../structures/Command.js';
import { hasDJRole } from '../../modules/music/index.js';

// /shuffle
export const shuffleCommand = new Command({
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),

    async execute(interaction) {
        const member = interaction.member as GuildMember;

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue || queue.tracks.size < 2) {
            await interaction.reply({
                content: '❌ Not enough songs in queue to shuffle.',
                ephemeral: true,
            });
            return;
        }

        queue.tracks.shuffle();

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setDescription(`🔀 Shuffled **${queue.tracks.size}** tracks!`)
            ],
        });
    },
});

// /loop
export const loopCommand = new Command({
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode')
        .addStringOption((opt) =>
            opt
                .setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: '❌ Off', value: 'off' },
                    { name: '🔂 Track', value: 'track' },
                    { name: '🔁 Queue', value: 'queue' },
                    { name: '♾️ Autoplay', value: 'autoplay' }
                )
        ),

    async execute(interaction) {
        const member = interaction.member as GuildMember;
        const mode = interaction.options.getString('mode', true);

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue) {
            await interaction.reply({ content: '❌ No music queue found.', ephemeral: true });
            return;
        }

        const modes: Record<string, { mode: QueueRepeatMode; emoji: string; name: string }> = {
            off: { mode: QueueRepeatMode.OFF, emoji: '❌', name: 'Off' },
            track: { mode: QueueRepeatMode.TRACK, emoji: '🔂', name: 'Track' },
            queue: { mode: QueueRepeatMode.QUEUE, emoji: '🔁', name: 'Queue' },
            autoplay: { mode: QueueRepeatMode.AUTOPLAY, emoji: '♾️', name: 'Autoplay' },
        };

        const selected = modes[mode];
        queue.setRepeatMode(selected.mode);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setDescription(`${selected.emoji} Loop mode set to **${selected.name}**`)
            ],
        });
    },
});

export default shuffleCommand;
