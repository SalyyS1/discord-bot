/**
 * Apple Music-style music embed
 */

import { EmbedBuilder } from 'discord.js';
import { Track, GuildQueue } from 'discord-player';

export function createAppleMusicEmbed(track: Track, queue?: GuildQueue): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(0xFC3C44) // Apple Music pink/red gradient
        .setTitle('🍎 Now Playing')
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: '🎤 Artist', value: track.author || 'Unknown', inline: true },
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
            text: `Requested by ${track.requestedBy.username} • Apple Music`,
            iconURL: track.requestedBy.displayAvatarURL(),
        });
    }

    return embed;
}
