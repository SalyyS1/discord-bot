import {
    SlashCommandBuilder,
    VoiceChannel,
    GuildMember,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TempVoiceModule } from '../../modules/tempvoice/index.js';
import { prisma } from '../../lib/prisma.js';

export default new Command({
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Voice channel management')
        .addSubcommand((sub) =>
            sub.setName('settings').setDescription('Open voice channel control panel')
        )
        .addSubcommand((sub) =>
            sub
                .setName('bitrate')
                .setDescription('Set audio quality (bitrate)')
                .addIntegerOption((opt) =>
                    opt
                        .setName('kbps')
                        .setDescription('Bitrate in kbps')
                        .setRequired(true)
                        .addChoices(
                            { name: '64 kbps (Low)', value: 64 },
                            { name: '96 kbps (Normal)', value: 96 },
                            { name: '128 kbps (High)', value: 128 },
                            { name: '256 kbps (Best)', value: 256 },
                            { name: '384 kbps (Boost)', value: 384 }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('permit')
                .setDescription('Allow a user to join your locked channel')
                .addUserOption((opt) =>
                    opt.setName('user').setDescription('User to permit').setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('reject')
                .setDescription('Kick and block a user from your channel')
                .addUserOption((opt) =>
                    opt.setName('user').setDescription('User to reject').setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub.setName('claim').setDescription('Claim ownership if the owner left')
        )
        .addSubcommand((sub) =>
            sub
                .setName('transfer')
                .setDescription('Transfer channel ownership to another user')
                .addUserOption((opt) =>
                    opt.setName('user').setDescription('New owner').setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub.setName('hide').setDescription('Hide your channel from others')
        )
        .addSubcommand((sub) =>
            sub.setName('show').setDescription('Make your channel visible')
        ),

    async execute(interaction) {
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice?.channel as VoiceChannel | null;
        const subcommand = interaction.options.getSubcommand();

        // Most commands require being in a temp voice channel
        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ You must be in a voice channel.',
                ephemeral: true,
            });
            return;
        }

        // Check if it's a temp channel
        const session = await prisma.voiceSession.findUnique({
            where: { channelId: voiceChannel.id },
        });

        // For claim, don't require ownership
        if (subcommand !== 'claim') {
            if (!session) {
                await interaction.reply({
                    content: '❌ This is not a temp voice channel.',
                    ephemeral: true,
                });
                return;
            }

            if (session.ownerId !== member.id) {
                await interaction.reply({
                    content: '❌ You are not the owner of this channel.',
                    ephemeral: true,
                });
                return;
            }
        }

        switch (subcommand) {
            case 'settings':
                await showSettingsPanel(interaction, voiceChannel, session!);
                break;
            case 'bitrate':
                await setBitrate(interaction, voiceChannel, session!);
                break;
            case 'permit':
                await permitUser(interaction, voiceChannel, session!);
                break;
            case 'reject':
                await rejectUser(interaction, voiceChannel, session!);
                break;
            case 'claim':
                await claimChannel(interaction, voiceChannel);
                break;
            case 'transfer':
                await transferOwnership(interaction, voiceChannel, session!);
                break;
            case 'hide':
                await hideChannel(interaction, voiceChannel, session!);
                break;
            case 'show':
                await showChannel(interaction, voiceChannel, session!);
                break;
        }
    },
});

async function showSettingsPanel(
    interaction: any,
    channel: VoiceChannel,
    session: any
) {
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎙️ Voice Channel Settings')
        .setDescription(`**${channel.name}**\nOwner: <@${session.ownerId}>`)
        .addFields(
            { name: '👥 User Limit', value: session.userLimit === 0 ? 'Unlimited' : String(session.userLimit), inline: true },
            { name: '🔊 Bitrate', value: `${session.bitrate} kbps`, inline: true },
            { name: '🔒 Locked', value: session.locked ? 'Yes' : 'No', inline: true },
            { name: '👁️ Hidden', value: session.hidden ? 'Yes' : 'No', inline: true }
        )
        .setFooter({ text: 'Click buttons below to change settings' });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('voice_lock')
            .setLabel(session.locked ? 'Unlock' : 'Lock')
            .setEmoji(session.locked ? '🔓' : '🔒')
            .setStyle(session.locked ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('voice_hide')
            .setLabel(session.hidden ? 'Show' : 'Hide')
            .setEmoji(session.hidden ? '👁️' : '🙈')
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

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true,
    });
}

async function setBitrate(interaction: any, channel: VoiceChannel, session: any) {
    const kbps = interaction.options.getInteger('kbps', true);

    // Check if server has boost level for higher bitrate
    const maxBitrate = channel.guild.premiumTier === 0 ? 96 :
        channel.guild.premiumTier === 1 ? 128 :
            channel.guild.premiumTier === 2 ? 256 : 384;

    if (kbps > maxBitrate) {
        await interaction.reply({
            content: `❌ Your server only supports up to ${maxBitrate} kbps. Need higher boost level.`,
            ephemeral: true,
        });
        return;
    }

    await channel.setBitrate(kbps * 1000);
    await prisma.voiceSession.update({
        where: { channelId: channel.id },
        data: { bitrate: kbps },
    });

    await interaction.reply({
        content: `✅ Bitrate set to **${kbps} kbps**.`,
        ephemeral: true,
    });
}

async function permitUser(interaction: any, channel: VoiceChannel, session: any) {
    const user = interaction.options.getUser('user', true);

    await channel.permissionOverwrites.edit(user.id, {
        Connect: true,
        ViewChannel: true,
    });

    const permitted = [...session.permitted, user.id];
    await prisma.voiceSession.update({
        where: { channelId: channel.id },
        data: { permitted },
    });

    await interaction.reply({
        content: `✅ <@${user.id}> can now join your channel.`,
        ephemeral: true,
    });
}

async function rejectUser(interaction: any, channel: VoiceChannel, session: any) {
    const user = interaction.options.getUser('user', true);
    const targetMember = channel.guild.members.cache.get(user.id);

    // Kick from channel if present
    if (targetMember?.voice?.channelId === channel.id) {
        await targetMember.voice.disconnect('Rejected by channel owner');
    }

    // Block from joining
    await channel.permissionOverwrites.edit(user.id, {
        Connect: false,
    });

    const rejected = [...session.rejected, user.id];
    await prisma.voiceSession.update({
        where: { channelId: channel.id },
        data: { rejected },
    });

    await interaction.reply({
        content: `✅ <@${user.id}> has been kicked and blocked.`,
        ephemeral: true,
    });
}

async function claimChannel(interaction: any, channel: VoiceChannel) {
    const session = await prisma.voiceSession.findUnique({
        where: { channelId: channel.id },
    });

    if (!session) {
        await interaction.reply({
            content: '❌ This is not a temp voice channel.',
            ephemeral: true,
        });
        return;
    }

    // Check if owner is still in the channel
    const owner = channel.members.get(session.ownerId);
    if (owner) {
        await interaction.reply({
            content: '❌ The owner is still in the channel.',
            ephemeral: true,
        });
        return;
    }

    const member = interaction.member as GuildMember;

    // Transfer ownership
    await prisma.voiceSession.update({
        where: { channelId: channel.id },
        data: { ownerId: member.id },
    });

    // Update permissions
    await channel.permissionOverwrites.edit(member.id, {
        Connect: true,
        ManageChannels: true,
        MuteMembers: true,
        DeafenMembers: true,
        MoveMembers: true,
    });

    await interaction.reply({
        content: '✅ You are now the owner of this channel!',
        ephemeral: true,
    });
}

async function transferOwnership(interaction: any, channel: VoiceChannel, session: any) {
    const user = interaction.options.getUser('user', true);
    const newOwner = channel.members.get(user.id);

    if (!newOwner) {
        await interaction.reply({
            content: '❌ That user is not in the channel.',
            ephemeral: true,
        });
        return;
    }

    const member = interaction.member as GuildMember;

    // Remove old owner permissions
    await channel.permissionOverwrites.delete(member.id).catch(() => { });

    // Add new owner permissions
    await channel.permissionOverwrites.edit(user.id, {
        Connect: true,
        ManageChannels: true,
        MuteMembers: true,
        DeafenMembers: true,
        MoveMembers: true,
    });

    await prisma.voiceSession.update({
        where: { channelId: channel.id },
        data: { ownerId: user.id },
    });

    await interaction.reply({
        content: `✅ Ownership transferred to <@${user.id}>.`,
    });
}

async function hideChannel(interaction: any, channel: VoiceChannel, session: any) {
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        ViewChannel: false,
    });

    await prisma.voiceSession.update({
        where: { channelId: channel.id },
        data: { hidden: true },
    });

    await interaction.reply({
        content: '✅ Channel is now hidden.',
        ephemeral: true,
    });
}

async function showChannel(interaction: any, channel: VoiceChannel, session: any) {
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        ViewChannel: null, // Reset to default
    });

    await prisma.voiceSession.update({
        where: { channelId: channel.id },
        data: { hidden: false },
    });

    await interaction.reply({
        content: '✅ Channel is now visible.',
        ephemeral: true,
    });
}
