/**
 * Music Embed Generator Service
 * Detects platform and generates appropriate styled embeds
 */

import { Track, GuildQueue } from 'discord-player';
import { EmbedBuilder } from 'discord.js';
import { createYouTubeEmbed } from '../embeds/youtube-music-embed.js';
import { createSpotifyEmbed } from '../embeds/spotify-music-embed.js';
import { createAppleMusicEmbed } from '../embeds/apple-music-embed.js';

export enum MusicPlatform {
    YOUTUBE = 'youtube',
    SPOTIFY = 'spotify',
    APPLE_MUSIC = 'apple_music',
    SOUNDCLOUD = 'soundcloud',
    UNKNOWN = 'unknown',
}

/**
 * Detect music platform from track URL or metadata
 */
export function detectPlatform(track: Track): MusicPlatform {
    const url = track.url.toLowerCase();
    const source = track.source?.toLowerCase() || '';

    // YouTube detection
    if (url.includes('youtube.com') || url.includes('youtu.be') || source.includes('youtube')) {
        return MusicPlatform.YOUTUBE;
    }

    // Spotify detection
    if (url.includes('spotify.com') || source.includes('spotify')) {
        return MusicPlatform.SPOTIFY;
    }

    // Apple Music detection
    if (url.includes('music.apple.com') || source.includes('apple')) {
        return MusicPlatform.APPLE_MUSIC;
    }

    // SoundCloud detection
    if (url.includes('soundcloud.com') || source.includes('soundcloud')) {
        return MusicPlatform.SOUNDCLOUD;
    }

    return MusicPlatform.UNKNOWN;
}

/**
 * Generate platform-specific music embed
 */
export function generateMusicEmbed(track: Track, queue?: GuildQueue): EmbedBuilder {
    const platform = detectPlatform(track);

    switch (platform) {
        case MusicPlatform.YOUTUBE:
            return createYouTubeEmbed(track, queue);

        case MusicPlatform.SPOTIFY:
            return createSpotifyEmbed(track, queue);

        case MusicPlatform.APPLE_MUSIC:
            return createAppleMusicEmbed(track, queue);

        case MusicPlatform.SOUNDCLOUD:
            return createSoundCloudEmbed(track, queue);

        default:
            return createGenericEmbed(track, queue);
    }
}

/**
 * SoundCloud-style embed
 */
function createSoundCloudEmbed(track: Track, queue?: GuildQueue): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0xFF7700) // SoundCloud orange
        .setTitle('🎧 Now Playing')
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: track.duration, inline: true }
        );

    if (queue) {
        const progress = queue.node.createProgressBar({
            length: 20,
            timecodes: true,
            queue: false,
        });

        embed.addFields(
            { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
            { name: '━━━━━━━━━━━━━━━━━━━━', value: progress || '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', inline: false }
        );
    }

    if (track.requestedBy) {
        embed.setFooter({
            text: `Requested by ${track.requestedBy.username} • SoundCloud`,
            iconURL: track.requestedBy.displayAvatarURL(),
        });
    }

    return embed;
}

/**
 * Generic fallback embed for unknown platforms
 */
function createGenericEmbed(track: Track, queue?: GuildQueue): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord blurple
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: track.duration, inline: true }
        );

    if (queue) {
        const progress = queue.node.createProgressBar({
            length: 20,
            timecodes: true,
            queue: false,
        });

        embed.addFields(
            { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
            { name: '📊 Progress', value: progress || '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', inline: false }
        );
    }

    if (track.requestedBy) {
        embed.setFooter({
            text: `Requested by ${track.requestedBy.username}`,
            iconURL: track.requestedBy.displayAvatarURL(),
        });
    }

    return embed;
}
