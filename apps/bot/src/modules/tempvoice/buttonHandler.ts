/**
 * Voice Control Panel Button Handler
 * Handles button interactions from /voice settings panel
 */

import {
    ButtonInteraction,
    VoiceChannel,
    GuildMember,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

export class VoiceButtonHandler {
    /**
     * Handle voice control panel button clicks
     */
    static async handle(interaction: ButtonInteraction): Promise<boolean> {
        const customId = interaction.customId;

        if (!customId.startsWith('voice_')) {
            return false; // Not a voice button
        }

        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice?.channel as VoiceChannel | null;

        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ You must be in a voice channel.',
                ephemeral: true,
            });
            return true;
        }

        // Check TempVoiceChannel table (created by TempVoiceModule)
        const session = await prisma.tempVoiceChannel.findUnique({
            where: { channelId: voiceChannel.id },
        });

        if (!session) {
            await interaction.reply({
                content: '❌ This is not a temp voice channel.',
                ephemeral: true,
            });
            return true;
        }

        if (session.ownerId !== member.id) {
            await interaction.reply({
                content: '❌ You are not the owner of this channel.',
                ephemeral: true,
            });
            return true;
        }

        try {
            switch (customId) {
                case 'voice_lock':
                    await this.toggleLock(interaction, voiceChannel, session);
                    break;
                case 'voice_hide':
                    await this.toggleHide(interaction, voiceChannel, session);
                    break;
                case 'voice_limit':
                    await this.showLimitModal(interaction);
                    break;
                case 'voice_rename':
                    await this.showRenameModal(interaction);
                    break;
                case 'voice_bitrate':
                    await this.showBitrateMenu(interaction, voiceChannel);
                    break;
                case 'voice_permit':
                    await this.showPermitMenu(interaction);
                    break;
                case 'voice_reject':
                    await this.showRejectMenu(interaction, voiceChannel);
                    break;
                case 'voice_invite':
                    await this.showInviteMenu(interaction);
                    break;
                case 'voice_kick':
                    await this.showKickMenu(interaction, voiceChannel);
                    break;
                case 'voice_block':
                    await this.showBlockMenu(interaction);
                    break;
                case 'voice_unblock':
                    await this.showUnblockMenu(interaction, session);
                    break;
                case 'voice_claim':
                    await this.handleClaim(interaction, voiceChannel, session);
                    break;
                case 'voice_transfer':
                    await this.showTransferMenu(interaction, voiceChannel);
                    break;
                case 'voice_delete':
                    await this.handleDelete(interaction, voiceChannel);
                    break;
                case 'voice_region':
                    await this.showRegionMenu(interaction);
                    break;
                default:
                    return false;
            }
        } catch (error) {
            logger.error(`Voice button error (${customId}):`, error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    ephemeral: true,
                });
            }
        }

        return true;
    }

    private static async toggleLock(
        interaction: ButtonInteraction,
        channel: VoiceChannel,
        session: any
    ) {
        const newLocked = !session.locked;

        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            Connect: newLocked ? false : null,
        });

        await prisma.tempVoiceChannel.update({
            where: { channelId: channel.id },
            data: { locked: newLocked },
        });

        await interaction.reply({
            content: newLocked
                ? '🔒 Channel is now **locked**. Only permitted users can join.'
                : '🔓 Channel is now **unlocked**. Anyone can join.',
            ephemeral: true,
        });
    }

    private static async toggleHide(
        interaction: ButtonInteraction,
        channel: VoiceChannel,
        session: any
    ) {
        const newHidden = !session.hidden;

        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            ViewChannel: newHidden ? false : null,
        });

        await prisma.tempVoiceChannel.update({
            where: { channelId: channel.id },
            data: { hidden: newHidden },
        });

        await interaction.reply({
            content: newHidden
                ? '🙈 Channel is now **hidden** from others.'
                : '👁️ Channel is now **visible** to everyone.',
            ephemeral: true,
        });
    }

    private static async showLimitModal(interaction: ButtonInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('voice_limit_modal')
            .setTitle('Set User Limit')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('limit')
                        .setLabel('User limit (0-99, 0 = unlimited)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0')
                        .setMaxLength(2)
                        .setRequired(true)
                )
            );

        await interaction.showModal(modal);
    }

    private static async showRenameModal(interaction: ButtonInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('voice_rename_modal')
            .setTitle('Rename Channel')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('New channel name')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Enter new name...")
                        .setMaxLength(100)
                        .setRequired(true)
                )
            );

        await interaction.showModal(modal);
    }

    private static async showBitrateMenu(
        interaction: ButtonInteraction,
        channel: VoiceChannel
    ) {
        const maxBitrate = channel.guild.premiumTier === 0 ? 96 :
            channel.guild.premiumTier === 1 ? 128 :
                channel.guild.premiumTier === 2 ? 256 : 384;

        const options = [
            { label: '64 kbps (Low)', value: '64' },
            { label: '96 kbps (Normal)', value: '96' },
        ];

        if (maxBitrate >= 128) options.push({ label: '128 kbps (High)', value: '128' });
        if (maxBitrate >= 256) options.push({ label: '256 kbps (Best)', value: '256' });
        if (maxBitrate >= 384) options.push({ label: '384 kbps (Boost)', value: '384' });

        const select = new StringSelectMenuBuilder()
            .setCustomId('voice_bitrate_select')
            .setPlaceholder('Select bitrate...')
            .addOptions(options.map(o =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(o.label)
                    .setValue(o.value)
            ));

        await interaction.reply({
            content: '🔊 Select audio quality:',
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    private static async showPermitMenu(interaction: ButtonInteraction) {
        const select = new UserSelectMenuBuilder()
            .setCustomId('voice_permit_select')
            .setPlaceholder('Select user to permit...');

        await interaction.reply({
            content: '✅ Select a user to permit:',
            components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    private static async showRejectMenu(
        interaction: ButtonInteraction,
        channel: VoiceChannel
    ) {
        // Show users currently in the channel (except owner)
        const members = channel.members.filter(m => m.id !== interaction.user.id);

        if (members.size === 0) {
            await interaction.reply({
                content: '❌ No other users in the channel to kick.',
                ephemeral: true,
            });
            return;
        }

        const select = new UserSelectMenuBuilder()
            .setCustomId('voice_reject_select')
            .setPlaceholder('Select user to kick...');

        await interaction.reply({
            content: '❌ Select a user to kick and block:',
            components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    // ═══════════════════════════════════════════════
    // NEW BUTTON HANDLERS
    // ═══════════════════════════════════════════════

    private static async showInviteMenu(interaction: ButtonInteraction) {
        const select = new UserSelectMenuBuilder()
            .setCustomId('voice_invite_select')
            .setPlaceholder('Select user to invite...');

        await interaction.reply({
            content: '📩 Select a user to invite to your channel:',
            components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    private static async showKickMenu(
        interaction: ButtonInteraction,
        channel: VoiceChannel
    ) {
        const members = channel.members.filter(m => m.id !== interaction.user.id);

        if (members.size === 0) {
            await interaction.reply({
                content: '❌ No other users in the channel to kick.',
                ephemeral: true,
            });
            return;
        }

        const select = new UserSelectMenuBuilder()
            .setCustomId('voice_kick_select')
            .setPlaceholder('Select user to kick...');

        await interaction.reply({
            content: '👢 Select a user to kick (without blocking):',
            components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    private static async showBlockMenu(interaction: ButtonInteraction) {
        const select = new UserSelectMenuBuilder()
            .setCustomId('voice_block_select')
            .setPlaceholder('Select user to block...');

        await interaction.reply({
            content: '🚫 Select a user to block from joining:',
            components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    private static async showUnblockMenu(
        interaction: ButtonInteraction,
        session: any
    ) {
        if (!session.rejected || session.rejected.length === 0) {
            await interaction.reply({
                content: '❌ No blocked users to unblock.',
                ephemeral: true,
            });
            return;
        }

        const options = session.rejected.slice(0, 25).map((userId: string) =>
            new StringSelectMenuOptionBuilder()
                .setLabel(`User ${userId.slice(-4)}`)
                .setValue(userId)
                .setDescription(`ID: ${userId}`)
        );

        const select = new StringSelectMenuBuilder()
            .setCustomId('voice_unblock_select')
            .setPlaceholder('Select user to unblock...')
            .addOptions(options);

        await interaction.reply({
            content: '🔓 Select a user to unblock:',
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    private static async handleClaim(
        interaction: ButtonInteraction,
        channel: VoiceChannel,
        session: any
    ) {
        // Check if owner is still in channel
        const owner = channel.members.get(session.ownerId);
        if (owner) {
            await interaction.reply({
                content: '❌ The owner is still in the channel. You cannot claim it.',
                ephemeral: true,
            });
            return;
        }

        // Transfer ownership to claimant
        await prisma.tempVoiceChannel.update({
            where: { channelId: channel.id },
            data: { ownerId: interaction.user.id },
        });

        await interaction.reply({
            content: '👑 You are now the owner of this channel!',
            ephemeral: true,
        });
    }

    private static async showTransferMenu(
        interaction: ButtonInteraction,
        channel: VoiceChannel
    ) {
        const members = channel.members.filter(m => m.id !== interaction.user.id);

        if (members.size === 0) {
            await interaction.reply({
                content: '❌ No other users in the channel to transfer to.',
                ephemeral: true,
            });
            return;
        }

        const select = new UserSelectMenuBuilder()
            .setCustomId('voice_transfer_select')
            .setPlaceholder('Select new owner...');

        await interaction.reply({
            content: '🔄 Select a user to transfer ownership to:',
            components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    private static async handleDelete(
        interaction: ButtonInteraction,
        channel: VoiceChannel
    ) {
        await interaction.reply({
            content: '🗑️ Deleting channel...',
            ephemeral: true,
        });

        // Delete session first
        await prisma.tempVoiceChannel.delete({
            where: { channelId: channel.id },
        });

        // Then delete channel
        await channel.delete('Owner requested deletion');
    }

    private static async showRegionMenu(interaction: ButtonInteraction) {
        const regions = [
            { label: '🌐 Automatic', value: 'auto' },
            { label: '🇧🇷 Brazil', value: 'brazil' },
            { label: '🇭🇰 Hong Kong', value: 'hongkong' },
            { label: '🇮🇳 India', value: 'india' },
            { label: '🇯🇵 Japan', value: 'japan' },
            { label: '🇳🇱 Rotterdam', value: 'rotterdam' },
            { label: '🇷🇺 Russia', value: 'russia' },
            { label: '🇸🇬 Singapore', value: 'singapore' },
            { label: '🇦🇺 Sydney', value: 'sydney' },
            { label: '🇺🇸 US Central', value: 'us-central' },
            { label: '🇺🇸 US East', value: 'us-east' },
            { label: '🇺🇸 US West', value: 'us-west' },
        ];

        const select = new StringSelectMenuBuilder()
            .setCustomId('voice_region_select')
            .setPlaceholder('Select region...')
            .addOptions(regions.map(r =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(r.label)
                    .setValue(r.value)
            ));

        await interaction.reply({
            content: '🌐 Select voice region:',
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            ephemeral: true,
        });
    }

    /**
     * Handle voice modal submissions
     */
    static async handleModal(interaction: any): Promise<boolean> {
        const customId = interaction.customId;

        if (customId === 'voice_limit_modal') {
            const limitStr = interaction.fields.getTextInputValue('limit');
            const limit = parseInt(limitStr, 10);

            if (isNaN(limit) || limit < 0 || limit > 99) {
                await interaction.reply({
                    content: '❌ Invalid limit. Must be 0-99.',
                    ephemeral: true,
                });
                return true;
            }

            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await channel.setUserLimit(limit);
            await prisma.tempVoiceChannel.update({
                where: { channelId: channel.id },
                data: { userLimit: limit },
            });

            await interaction.reply({
                content: limit === 0
                    ? '✅ User limit removed (unlimited).'
                    : `✅ User limit set to **${limit}** users.`,
                ephemeral: true,
            });
            return true;
        }

        if (customId === 'voice_rename_modal') {
            const name = interaction.fields.getTextInputValue('name');
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await channel.setName(name);
            await prisma.tempVoiceChannel.update({
                where: { channelId: channel.id },
                data: { name },
            });

            await interaction.reply({
                content: `✅ Channel renamed to **${name}**.`,
                ephemeral: true,
            });
            return true;
        }

        return false;
    }

    /**
     * Handle voice select menu interactions
     */
    static async handleSelect(interaction: any): Promise<boolean> {
        const customId = interaction.customId;

        if (customId === 'voice_bitrate_select') {
            const bitrate = parseInt(interaction.values[0], 10);
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await channel.setBitrate(bitrate * 1000);
            await prisma.tempVoiceChannel.update({
                where: { channelId: channel.id },
                data: { bitrate },
            });

            await interaction.reply({
                content: `✅ Bitrate set to **${bitrate} kbps**.`,
                ephemeral: true,
            });
            return true;
        }

        if (customId === 'voice_permit_select') {
            const userId = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await channel.permissionOverwrites.edit(userId, {
                Connect: true,
                ViewChannel: true,
            });

            const session = await prisma.tempVoiceChannel.findUnique({
                where: { channelId: channel.id },
            });

            if (session) {
                const permitted = [...session.permitted, userId];
                await prisma.tempVoiceChannel.update({
                    where: { channelId: channel.id },
                    data: { permitted },
                });
            }

            await interaction.reply({
                content: `✅ <@${userId}> can now join your channel.`,
                ephemeral: true,
            });
            return true;
        }

        if (customId === 'voice_reject_select') {
            const userId = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            // Kick if in channel
            const target = channel.guild.members.cache.get(userId);
            if (target?.voice?.channelId === channel.id) {
                await target.voice.disconnect('Rejected by channel owner');
            }

            // Block from joining
            await channel.permissionOverwrites.edit(userId, {
                Connect: false,
            });

            const session = await prisma.tempVoiceChannel.findUnique({
                where: { channelId: channel.id },
            });

            if (session) {
                const rejected = [...session.rejected, userId];
                await prisma.tempVoiceChannel.update({
                    where: { channelId: channel.id },
                    data: { rejected },
                });
            }

            await interaction.reply({
                content: `✅ <@${userId}> has been kicked and blocked.`,
                ephemeral: true,
            });
            return true;
        }

        // Handle invite select
        if (customId === 'voice_invite_select') {
            const userId = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            // Send DM invite to user
            try {
                const targetUser = await interaction.client.users.fetch(userId);
                const invite = await channel.createInvite({ maxAge: 3600, maxUses: 1 });
                await targetUser.send({
                    content: `📩 **${member.user.tag}** invited you to join their voice channel!\n\n🔗 ${invite.url}`,
                });
                await interaction.reply({
                    content: `✅ Invite sent to <@${userId}>!`,
                    ephemeral: true,
                });
            } catch {
                await interaction.reply({
                    content: '❌ Could not send invite. User may have DMs disabled.',
                    ephemeral: true,
                });
            }
            return true;
        }

        // Handle kick select (without blocking)
        if (customId === 'voice_kick_select') {
            const userId = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            const target = channel.guild.members.cache.get(userId);
            if (target?.voice?.channelId === channel.id) {
                await target.voice.disconnect('Kicked by channel owner');
            }

            await interaction.reply({
                content: `✅ <@${userId}> has been kicked from the channel.`,
                ephemeral: true,
            });
            return true;
        }

        // Handle block select
        if (customId === 'voice_block_select') {
            const userId = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await channel.permissionOverwrites.edit(userId, {
                Connect: false,
            });

            const session = await prisma.tempVoiceChannel.findUnique({
                where: { channelId: channel.id },
            });

            if (session) {
                const rejected = [...(session.rejected || []), userId];
                await prisma.tempVoiceChannel.update({
                    where: { channelId: channel.id },
                    data: { rejected },
                });
            }

            await interaction.reply({
                content: `✅ <@${userId}> has been blocked from joining.`,
                ephemeral: true,
            });
            return true;
        }

        // Handle unblock select
        if (customId === 'voice_unblock_select') {
            const userId = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await channel.permissionOverwrites.delete(userId);

            const session = await prisma.tempVoiceChannel.findUnique({
                where: { channelId: channel.id },
            });

            if (session) {
                const rejected = (session.rejected || []).filter((id: string) => id !== userId);
                await prisma.tempVoiceChannel.update({
                    where: { channelId: channel.id },
                    data: { rejected },
                });
            }

            await interaction.reply({
                content: `✅ <@${userId}> has been unblocked.`,
                ephemeral: true,
            });
            return true;
        }

        // Handle transfer select
        if (customId === 'voice_transfer_select') {
            const userId = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await prisma.tempVoiceChannel.update({
                where: { channelId: channel.id },
                data: { ownerId: userId },
            });

            // Update permissions
            await channel.permissionOverwrites.delete(member.id);
            await channel.permissionOverwrites.edit(userId, {
                Connect: true,
                ManageChannels: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true,
            });

            await interaction.reply({
                content: `✅ Ownership transferred to <@${userId}>!`,
                ephemeral: true,
            });
            return true;
        }

        // Handle region select
        if (customId === 'voice_region_select') {
            const region = interaction.values[0];
            const member = interaction.member as GuildMember;
            const channel = member.voice?.channel as VoiceChannel;

            if (!channel) {
                await interaction.reply({
                    content: '❌ You must be in a voice channel.',
                    ephemeral: true,
                });
                return true;
            }

            await channel.setRTCRegion(region === 'auto' ? null : region);

            await interaction.reply({
                content: `✅ Voice region set to **${region === 'auto' ? 'Automatic' : region}**!`,
                ephemeral: true,
            });
            return true;
        }

        return false;
    }
}
