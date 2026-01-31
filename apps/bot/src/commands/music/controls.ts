/**
 * Core music commands: pause, resume, skip, stop
 */

import { SlashCommandBuilder, GuildMember, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import { Command } from '../../structures/Command.js';
import { hasDJRole } from '../../modules/music/index.js';

// /pause
export const pauseCommand = new Command({
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current track'),

    async execute(interaction) {
        const member = interaction.member as GuildMember;

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue?.isPlaying()) {
            await interaction.reply({ content: '❌ No music is playing.', ephemeral: true });
            return;
        }

        queue.node.pause();
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfee75c)
                    .setDescription('⏸️ Paused the music.')
            ],
        });
    },
});

// /resume
export const resumeCommand = new Command({
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused track'),

    async execute(interaction) {
        const member = interaction.member as GuildMember;

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue) {
            await interaction.reply({ content: '❌ No music queue found.', ephemeral: true });
            return;
        }

        if (!queue.node.isPaused()) {
            await interaction.reply({ content: '❌ Music is not paused.', ephemeral: true });
            return;
        }

        queue.node.resume();
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription('▶️ Resumed the music.')
            ],
        });
    },
});

// /skip
export const skipCommand = new Command({
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track'),

    async execute(interaction) {
        const member = interaction.member as GuildMember;

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue?.isPlaying()) {
            await interaction.reply({ content: '❌ No music is playing.', ephemeral: true });
            return;
        }

        const currentTrack = queue.currentTrack;
        queue.node.skip();

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setDescription(`⏭️ Skipped **${currentTrack?.title || 'current track'}**`)
            ],
        });
    },
});

// /stop
export const stopCommand = new Command({
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),

    async execute(interaction) {
        const member = interaction.member as GuildMember;

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({ content: '❌ You need the DJ role.', ephemeral: true });
            return;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue) {
            await interaction.reply({ content: '❌ No music queue found.', ephemeral: true });
            return;
        }

        queue.delete();
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xed4245)
                    .setDescription('⏹️ Stopped the music and cleared the queue.')
            ],
        });
    },
});

export default pauseCommand;
