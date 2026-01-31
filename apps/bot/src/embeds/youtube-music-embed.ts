/**
 * YouTube-style music embed
 */

import { EmbedBuilder } from 'discord.js';
import { Track, GuildQueue } from 'discord-player';

export function createYouTubeEmbed(track: Track, queue?: GuildQueue): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0xFF0000) // YouTube red
        .setTitle('▶️ Now Playing')
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: '📺 Channel', value: track.author || 'Unknown', inline: true },
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
