/**
 * /voice panel - Send a voice control panel to a channel
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
} from 'discord.js';
import { Command } from '../../structures/Command.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('voicepanel')
        .setDescription('Send a voice control panel to a channel')
        .addChannelOption((opt) =>
            opt
                .setName('channel')
                .setDescription('Channel to send the panel (default: current)')
                .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎙️ Voice Channel Control')
            .setDescription(
                'Use the buttons below to control your temporary voice channel.\n\n' +
                '**Requirements:**\n' +
                '• You must be in a temp voice channel\n' +
                '• You must be the channel owner\n\n' +
                '**Available Actions:**\n' +
                '🔒 **Lock/Unlock** - Restrict who can join\n' +
                '🙈 **Hide/Show** - Toggle channel visibility\n' +
                '👥 **Set Limit** - Change user limit\n' +
                '✏️ **Rename** - Change channel name\n' +
                '🔊 **Bitrate** - Adjust audio quality\n' +
                '✅ **Permit** - Allow specific users\n' +
                '❌ **Reject** - Kick and block users'
            )
            .setFooter({ text: 'Join a "Join to Create" channel to get your own voice room!' });

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('voice_lock')
                .setLabel('Lock/Unlock')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('voice_hide')
                .setLabel('Hide/Show')
                .setEmoji('🙈')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('voice_limit')
                .setLabel('Set Limit')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('voice_rename')
                .setLabel('Rename')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('voice_bitrate')
                .setLabel('Bitrate')
                .setEmoji('🔊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('voice_permit')
                .setLabel('Permit User')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('voice_reject')
                .setLabel('Kick User')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [row1, row2] });

        await interaction.reply({
            content: `✅ Voice control panel sent to ${channel}!`,
            ephemeral: true,
        });
    },
});
