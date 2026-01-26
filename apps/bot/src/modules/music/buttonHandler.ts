/**
 * Music Control Button Handler
 * Handles button interactions from nowplaying panel
 */

import { ButtonInteraction, GuildMember } from 'discord.js';
import { useQueue, QueueRepeatMode } from 'discord-player';
import { hasDJRole } from './index.js';
import { logger } from '../../utils/logger.js';

export class MusicButtonHandler {
    /**
     * Handle music control button clicks
     */
    static async handle(interaction: ButtonInteraction): Promise<boolean> {
        const customId = interaction.customId;

        if (!customId.startsWith('music_')) {
            return false;
        }

        const member = interaction.member as GuildMember;

        // Check DJ role
        if (!await hasDJRole(interaction.guildId!, member)) {
            await interaction.reply({
                content: '❌ You need the DJ role to use music controls.',
                ephemeral: true,
            });
            return true;
        }

        const queue = useQueue(interaction.guildId!);
        if (!queue) {
            await interaction.reply({
                content: '❌ No music queue found.',
                ephemeral: true,
            });
            return true;
        }

        try {
            switch (customId) {
                case 'music_previous':
                    // Go back to previous track
                    if (queue.history.previousTrack) {
                        await queue.history.back();
                        await interaction.reply({
                            content: '⏮️ Playing previous track.',
                            ephemeral: true,
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ No previous track.',
                            ephemeral: true,
                        });
                    }
                    break;

                case 'music_pause':
                    if (queue.node.isPaused()) {
                        queue.node.resume();
                        await interaction.reply({
                            content: '▶️ Resumed!',
                            ephemeral: true,
                        });
                    } else {
                        queue.node.pause();
                        await interaction.reply({
                            content: '⏸️ Paused!',
                            ephemeral: true,
                        });
                    }
                    break;

                case 'music_skip':
                    const skippedTrack = queue.currentTrack;
                    queue.node.skip();
                    await interaction.reply({
                        content: `⏭️ Skipped **${skippedTrack?.title || 'current track'}**`,
                        ephemeral: true,
                    });
                    break;

                case 'music_stop':
                    queue.delete();
                    await interaction.reply({
                        content: '⏹️ Stopped and cleared queue.',
                        ephemeral: true,
                    });
                    break;

                case 'music_shuffle':
                    if (queue.tracks.size < 2) {
                        await interaction.reply({
                            content: '❌ Not enough tracks to shuffle.',
                            ephemeral: true,
                        });
                    } else {
                        queue.tracks.shuffle();
                        await interaction.reply({
                            content: `🔀 Shuffled ${queue.tracks.size} tracks!`,
                            ephemeral: true,
                        });
                    }
                    break;

                case 'music_volup':
                    const newVolUp = Math.min(100, queue.node.volume + 10);
                    queue.node.setVolume(newVolUp);
                    await interaction.reply({
                        content: `🔊 Volume: **${newVolUp}%**`,
                        ephemeral: true,
                    });
                    break;

                case 'music_voldown':
                    const newVolDown = Math.max(0, queue.node.volume - 10);
                    queue.node.setVolume(newVolDown);
                    await interaction.reply({
                        content: `🔉 Volume: **${newVolDown}%**`,
                        ephemeral: true,
                    });
                    break;

                case 'music_loop':
                    const modeNames = ['Off', 'Track', 'Queue', 'Autoplay'];
                    const currentMode = queue.repeatMode;
                    const nextMode = ((currentMode + 1) % 4) as QueueRepeatMode;
                    queue.setRepeatMode(nextMode);
                    await interaction.reply({
                        content: `🔁 Loop: **${modeNames[nextMode]}**`,
                        ephemeral: true,
                    });
                    break;

                case 'music_queue':
                    const tracks = queue.tracks.toArray().slice(0, 10);
                    const current = queue.currentTrack;
                    let queueText = current
                        ? `**Now Playing:** [${current.title}](${current.url})\n\n`
                        : '';

                    if (tracks.length === 0) {
                        queueText += '*Queue is empty*';
                    } else {
                        queueText += '**Up Next:**\n' + tracks
                            .map((t, i) => `\`${i + 1}.\` ${t.title.slice(0, 40)}`)
                            .join('\n');
                    }

                    await interaction.reply({
                        content: queueText,
                        ephemeral: true,
                    });
                    break;

                default:
                    return false;
            }
        } catch (error) {
            logger.error(`Music button error (${customId}):`, error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    ephemeral: true,
                });
            }
        }

        return true;
    }
}
