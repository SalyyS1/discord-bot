/**
 * /play command - Play music from various sources
 */

import { SlashCommandBuilder, GuildMember, EmbedBuilder } from 'discord.js';
import { useMainPlayer, QueryType } from 'discord-player';
import { Command } from '../../structures/Command.js';
import { hasDJRole, getMusicSettings } from '../../modules/music/index.js';
import { logger } from '../../utils/logger.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist')
        .addStringOption((opt) =>
            opt
                .setName('query')
                .setDescription('Song name, URL, or playlist link')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async execute(interaction) {
        const member = interaction.member as GuildMember;
        const query = interaction.options.getString('query', true);

        // Check if user is in voice channel
        const channel = member.voice.channel;
        if (!channel) {
            await interaction.reply({
                content: '❌ You need to be in a voice channel to play music!',
                ephemeral: true,
            });
            return;
        }

        // Check DJ role
        const hasDJ = await hasDJRole(interaction.guildId!, member);
        if (!hasDJ) {
            await interaction.reply({
                content: '❌ You need the DJ role to use music commands.',
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            const player = useMainPlayer();

            const result = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO,
            });

            if (!result.hasTracks()) {
                await interaction.editReply({
                    content: '❌ No results found for your query.',
                });
                return;
            }

            const { track, searchResult } = await player.play(channel, result, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        requestedBy: interaction.user,
                    },
                    volume: 50,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000, // 5 minutes
                    leaveOnEnd: false,
                },
            });

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setThumbnail(track.thumbnail)
                .setFooter({ text: `Duration: ${track.duration}` });

            if (searchResult.playlist) {
                embed
                    .setTitle('📋 Playlist Added')
                    .setDescription(`**[${searchResult.playlist.title}](${searchResult.playlist.url})**\n\n${searchResult.tracks.length} tracks added to queue`);
            } else {
                embed
                    .setTitle('🎵 Added to Queue')
                    .setDescription(`**[${track.title}](${track.url})**\n\nBy ${track.author}`);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Play command error:', error);
            await interaction.editReply({
                content: '❌ Failed to play the track. Please try again.',
            });
        }
    },

    // Autocomplete for song search
    async autocomplete(interaction) {
        const query = interaction.options.getFocused();
        if (!query || query.length < 2) {
            await interaction.respond([]);
            return;
        }

        try {
            const player = useMainPlayer();
            const result = await player.search(query, {
                searchEngine: QueryType.YOUTUBE,
            });

            const choices = result.tracks.slice(0, 10).map((track) => ({
                name: `${track.title.slice(0, 80)} - ${track.author}`.slice(0, 100),
                value: track.url,
            }));

            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },
});
