/**
 * /playlist command - Manage saved playlists
 */

import { SlashCommandBuilder, GuildMember, EmbedBuilder } from 'discord.js';
import { useMainPlayer, QueryType } from 'discord-player';
import { Command } from '../../structures/Command.js';
import { hasDJRole } from '../../modules/music/index.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Manage and play saved playlists')
        .addSubcommand((sub) =>
            sub
                .setName('create')
                .setDescription('Create a new playlist')
                .addStringOption((opt) =>
                    opt
                        .setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setMaxLength(100)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Add current track to a playlist')
                .addStringOption((opt) =>
                    opt
                        .setName('playlist')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('play')
                .setDescription('Play a saved playlist')
                .addStringOption((opt) =>
                    opt
                        .setName('playlist')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('List your saved playlists')
        )
        .addSubcommand((sub) =>
            sub
                .setName('delete')
                .setDescription('Delete a playlist')
                .addStringOption((opt) =>
                    opt
                        .setName('playlist')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('info')
                .setDescription('Show playlist information')
                .addStringOption((opt) =>
                    opt
                        .setName('playlist')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async execute(interaction) {
        const member = interaction.member as GuildMember;
        const subcommand = interaction.options.getSubcommand();

        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({
                content: '❌ You need the DJ role to use playlist commands.',
                ephemeral: true,
            });
            return;
        }

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'add':
                    await handleAdd(interaction);
                    break;
                case 'play':
                    await handlePlay(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
                case 'delete':
                    await handleDelete(interaction);
                    break;
                case 'info':
                    await handleInfo(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Playlist command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true,
            });
        }
    },

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();

        try {
            const playlists = await prisma.savedPlaylist.findMany({
                where: {
                    guildId: interaction.guildId!,
                    createdBy: interaction.user.id,
                    name: {
                        contains: focusedValue,
                        mode: 'insensitive',
                    },
                },
                take: 25,
                select: {
                    name: true,
                },
            });

            const choices = playlists.map((p) => ({
                name: p.name,
                value: p.name,
            }));

            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },
});

async function handleCreate(interaction: any) {
    const name = interaction.options.getString('name', true);

    // Check if playlist already exists
    const existing = await prisma.savedPlaylist.findUnique({
        where: {
            guildId_name: {
                guildId: interaction.guildId!,
                name,
            },
        },
    });

    if (existing && existing.createdBy === interaction.user.id) {
        await interaction.reply({
            content: '❌ You already have a playlist with this name.',
            ephemeral: true,
        });
        return;
    }

    // Check playlist limit
    const count = await prisma.savedPlaylist.count({
        where: {
            guildId: interaction.guildId!,
            createdBy: interaction.user.id,
        },
    });

    if (count >= 100) {
        await interaction.reply({
            content: '❌ You have reached the maximum of 100 playlists.',
            ephemeral: true,
        });
        return;
    }

    await prisma.savedPlaylist.create({
        data: {
            guildId: interaction.guildId!,
            name,
            tracks: [],
            createdBy: interaction.user.id,
            isPublic: false,
        },
    });

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x57f287)
                .setDescription(`✅ Created playlist **${name}**\n\nUse \`/playlist add\` to add tracks!`),
        ],
    });
}

async function handleAdd(interaction: any) {
    const playlistName = interaction.options.getString('playlist', true);
    const player = useMainPlayer();
    const queue = player.queues.get(interaction.guildId!);

    if (!queue?.currentTrack) {
        await interaction.reply({
            content: '❌ No music is currently playing.',
            ephemeral: true,
        });
        return;
    }

    const playlist = await prisma.savedPlaylist.findUnique({
        where: {
            guildId_name: {
                guildId: interaction.guildId!,
                name: playlistName,
            },
        },
    });

    if (!playlist || playlist.createdBy !== interaction.user.id) {
        await interaction.reply({
            content: '❌ Playlist not found.',
            ephemeral: true,
        });
        return;
    }

    const track = queue.currentTrack;
    const tracks = playlist.tracks as any[];

    if (tracks.length >= 500) {
        await interaction.reply({
            content: '❌ Playlist has reached the maximum of 500 tracks.',
            ephemeral: true,
        });
        return;
    }

    tracks.push({
        title: track.title,
        url: track.url,
        duration: track.durationMS ? Math.floor(track.durationMS / 1000) : 0,
        thumbnail: track.thumbnail,
        artist: track.author,
    });

    await prisma.savedPlaylist.update({
        where: { id: playlist.id },
        data: { tracks },
    });

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x57f287)
                .setDescription(`✅ Added **${track.title}** to playlist **${playlistName}**`),
        ],
    });
}

async function handlePlay(interaction: any) {
    const playlistName = interaction.options.getString('playlist', true);
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
        await interaction.reply({
            content: '❌ You need to be in a voice channel.',
            ephemeral: true,
        });
        return;
    }

    const playlist = await prisma.savedPlaylist.findUnique({
        where: {
            guildId_name: {
                guildId: interaction.guildId!,
                name: playlistName,
            },
        },
    });

    if (!playlist) {
        await interaction.reply({
            content: '❌ Playlist not found.',
            ephemeral: true,
        });
        return;
    }

    const tracks = playlist.tracks as any[];

    if (tracks.length === 0) {
        await interaction.reply({
            content: '❌ This playlist is empty.',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply();

    const player = useMainPlayer();
    let addedCount = 0;

    for (const trackData of tracks) {
        try {
            const result = await player.search(trackData.url, {
                requestedBy: interaction.user,
            });

            if (result.hasTracks()) {
                await player.play(member.voice.channel, result, {
                    nodeOptions: {
                        metadata: {
                            channel: interaction.channel,
                            requestedBy: interaction.user,
                        },
                    },
                });
                addedCount++;
            }
        } catch (error) {
            logger.error(`Failed to add track: ${trackData.title}`, error);
        }
    }

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x57f287)
                .setDescription(`🎵 Playing playlist **${playlistName}**\n\n${addedCount}/${tracks.length} tracks added to queue`),
        ],
    });
}

async function handleList(interaction: any) {
    const playlists = await prisma.savedPlaylist.findMany({
        where: {
            guildId: interaction.guildId!,
            createdBy: interaction.user.id,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (playlists.length === 0) {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfee75c)
                    .setDescription('📋 You have no saved playlists.\n\nCreate one with `/playlist create`!'),
            ],
            ephemeral: true,
        });
        return;
    }

    const description = playlists
        .map((p, i) => {
            const tracks = p.tracks as any[];
            return `**${i + 1}.** ${p.name} (${tracks.length} tracks)${p.isPublic ? ' 🌐' : ''}`;
        })
        .join('\n');

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('📋 Your Playlists')
                .setDescription(description)
                .setFooter({ text: `Total: ${playlists.length} playlists` }),
        ],
        ephemeral: true,
    });
}

async function handleDelete(interaction: any) {
    const playlistName = interaction.options.getString('playlist', true);

    const playlist = await prisma.savedPlaylist.findUnique({
        where: {
            guildId_name: {
                guildId: interaction.guildId!,
                name: playlistName,
            },
        },
    });

    if (!playlist || playlist.createdBy !== interaction.user.id) {
        await interaction.reply({
            content: '❌ Playlist not found.',
            ephemeral: true,
        });
        return;
    }

    await prisma.savedPlaylist.delete({
        where: { id: playlist.id },
    });

    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xed4245)
                .setDescription(`🗑️ Deleted playlist **${playlistName}**`),
        ],
    });
}

async function handleInfo(interaction: any) {
    const playlistName = interaction.options.getString('playlist', true);

    const playlist = await prisma.savedPlaylist.findUnique({
        where: {
            guildId_name: {
                guildId: interaction.guildId!,
                name: playlistName,
            },
        },
    });

    if (!playlist) {
        await interaction.reply({
            content: '❌ Playlist not found.',
            ephemeral: true,
        });
        return;
    }

    const tracks = playlist.tracks as any[];
    const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const trackList = tracks
        .slice(0, 10)
        .map((t, i) => `${i + 1}. ${t.title}`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📋 ${playlist.name}`)
        .setDescription(trackList + (tracks.length > 10 ? `\n\n*...and ${tracks.length - 10} more*` : ''))
        .addFields(
            { name: '🎵 Tracks', value: `${tracks.length}`, inline: true },
            { name: '⏱️ Duration', value: durationStr, inline: true },
            { name: '🌐 Visibility', value: playlist.isPublic ? 'Public' : 'Private', inline: true }
        )
        .setFooter({ text: `Created by ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
