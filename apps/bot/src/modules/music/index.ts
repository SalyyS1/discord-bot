/**
 * Music Player Module
 * Full-featured music bot with YouTube, Spotify, SoundCloud support
 */

import { Player, GuildQueue, Track, useMainPlayer } from 'discord-player';
import { Client, EmbedBuilder, TextChannel, VoiceChannel, User } from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

// Define metadata interface for type safety
interface QueueMetadata {
    channel?: TextChannel;
    requestedBy?: User;
}

let player: Player | null = null;

/**
 * Initialize the music player
 */
export async function initMusicPlayer(client: Client): Promise<Player> {
    player = new Player(client, {
        skipFFmpeg: false,
    });

    // Load default extractors (YouTube, Spotify, etc.)
    await player.extractors.loadDefault();

    // Player events
    player.events.on('playerStart', async (queue: GuildQueue, track: Track) => {
        const settings = await getMusicSettings(queue.guild.id);
        if (!settings?.announceTrackChange) return;

        const embed = createNowPlayingEmbed(track, queue);
        const channel = (queue.metadata as QueueMetadata)?.channel;

        if (channel) {
            try {
                await channel.send({ embeds: [embed] });
            } catch (error) {
                logger.error('Failed to send now playing message:', error);
            }
        }

        // Update listening history
        await updateListeningHistory(queue.guild.id, track);
    });

    player.events.on('audioTrackAdd', (queue: GuildQueue, track: Track) => {
        const channel = (queue.metadata as QueueMetadata)?.channel;
        if (channel) {
            channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865f2)
                        .setDescription(`➕ Added **[${track.title}](${track.url})** to queue`)
                        .setThumbnail(track.thumbnail)
                        .setFooter({ text: `Duration: ${track.duration} • Requested by ${track.requestedBy?.username || 'Unknown'}` })
                ],
            }).catch(() => { });
        }
    });

    player.events.on('emptyQueue', (queue: GuildQueue) => {
        const channel = (queue.metadata as QueueMetadata)?.channel;
        if (channel) {
            channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfee75c)
                        .setDescription('🎵 Queue finished! Add more songs to keep the party going.')
                ],
            }).catch(() => { });
        }
    });

    player.events.on('emptyChannel', async (queue: GuildQueue) => {
        const settings = await getMusicSettings(queue.guild.id);
        if (settings?.stay24_7) return; // Don't disconnect if 24/7 mode

        const channel = (queue.metadata as QueueMetadata)?.channel;
        if (channel) {
            channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xed4245)
                        .setDescription('👋 Left voice channel - no one is listening.')
                ],
            }).catch(() => { });
        }
    });

    player.events.on('playerError', (queue: GuildQueue, error: Error) => {
        logger.error(`Player error in ${queue.guild.id}:`, error);
        const channel = (queue.metadata as QueueMetadata)?.channel;
        if (channel) {
            channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xed4245)
                        .setDescription(`❌ Playback error: ${error.message}`)
                ],
            }).catch(() => { });
        }
    });

    player.events.on('error', (queue: GuildQueue, error: Error) => {
        logger.error(`Queue error in ${queue.guild.id}:`, error);
    });

    logger.info('[Music] Player initialized with default extractors');
    return player;
}

/**
 * Get the player instance
 */
export function getPlayer(): Player {
    if (!player) {
        throw new Error('Music player not initialized. Call initMusicPlayer first.');
    }
    return player;
}

/**
 * Get music settings for a guild
 */
export async function getMusicSettings(guildId: string) {
    try {
        return await prisma.musicSettings.findUnique({
            where: { guildId },
        });
    } catch {
        return null;
    }
}

/**
 * Check if user has DJ permissions
 */
export async function hasDJRole(guildId: string, member: any): Promise<boolean> {
    const settings = await getMusicSettings(guildId);

    // No DJ role set = everyone can control
    if (!settings?.djRoleId) return true;

    // Check if member has the DJ role
    return member.roles.cache.has(settings.djRoleId);
}

/**
 * Create now playing embed
 */
export function createNowPlayingEmbed(track: Track, queue: GuildQueue): EmbedBuilder {
    const progress = queue.node.createProgressBar({
        length: 15,
        timecodes: true,
        queue: false,
    });

    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail)
        .addFields(
            { name: 'Duration', value: track.duration, inline: true },
            { name: 'Author', value: track.author, inline: true },
            { name: 'Requested by', value: track.requestedBy?.username || 'Unknown', inline: true },
            { name: 'Progress', value: progress || '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', inline: false }
        )
        .setFooter({ text: `Volume: ${queue.node.volume}% | Loop: ${queue.repeatMode ? 'On' : 'Off'}` });
}

/**
 * Update listening history for stats
 */
async function updateListeningHistory(guildId: string, track: Track) {
    try {
        await prisma.listeningHistory.upsert({
            where: {
                guildId_trackUrl: { guildId, trackUrl: track.url },
            },
            update: {
                playCount: { increment: 1 },
                lastPlayed: new Date(),
            },
            create: {
                guildId,
                trackUrl: track.url,
                title: track.title,
                artist: track.author,
                duration: track.durationMS ? Math.floor(track.durationMS / 1000) : null,
                thumbnail: track.thumbnail,
            },
        });
    } catch (error) {
        logger.error('Failed to update listening history:', error);
    }
}

/**
 * Format duration from seconds
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get queue info
 */
export function getQueueInfo(queue: GuildQueue) {
    const tracks = queue.tracks.toArray();
    const totalDuration = tracks.reduce((acc, track) => acc + (track.durationMS || 0), 0);

    return {
        currentTrack: queue.currentTrack,
        tracks,
        size: tracks.length,
        totalDuration: formatDuration(Math.floor(totalDuration / 1000)),
        isPlaying: queue.node.isPlaying(),
        isPaused: queue.node.isPaused(),
        volume: queue.node.volume,
        repeatMode: queue.repeatMode,
    };
}
