/**
 * /musicpanel - Send a music control panel to a channel
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
    TextChannel,
    SlashCommandChannelOption,
} from 'discord.js';
import { Command } from '../../structures/Command.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('musicpanel')
        .setDescription('Send a music control panel to a channel')
        .addChannelOption((opt: SlashCommandChannelOption) =>
            opt
                .setName('channel')
                .setDescription('Channel to send the panel (default: current)')
                .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

        const embed = new EmbedBuilder()
            .setColor(0xeb459e)
            .setTitle('🎵 Music Player Control')
            .setDescription(
                'Control the music player using buttons or commands.\n\n' +
                '**Quick Commands:**\n' +
                '`/play <song>` - Play a song or playlist\n' +
                '`/queue` - View the current queue\n' +
                '`/nowplaying` - Show current track\n\n' +
                '**Supported Sources:**\n' +
                '• YouTube (videos & playlists)\n' +
                '• Spotify (tracks & playlists)\n' +
                '• SoundCloud\n' +
                '• Direct links (MP3, etc.)'
            )
            .setThumbnail('https://cdn.discordapp.com/emojis/892384085747658752.webp')
            .setFooter({ text: 'Join a voice channel and use /play to start!' });

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_pause')
                .setEmoji('⏸️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setEmoji('🔀')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('music_voldown')
                .setLabel('-10')
                .setEmoji('🔉')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_volup')
                .setLabel('+10')
                .setEmoji('🔊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji('🔁')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_queue')
                .setLabel('Queue')
                .setEmoji('📋')
                .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row1, row2] });

        await interaction.reply({
            content: `✅ Music control panel sent to ${channel}!`,
            ephemeral: true,
        });
    },
});
