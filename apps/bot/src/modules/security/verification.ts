import {
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { prisma } from '../../lib/prisma.js';
import { AutoRoleModule } from '../autorole/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Button-based verification module
 */
export class VerificationModule {
  /**
   * Send verification setup message to channel
   */
  static async setupVerification(
    channel: TextChannel,
    roleId: string
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('✅ Verification Required')
      .setDescription(
        'Click the button below to verify yourself and gain access to the server.\n\n' +
          'This helps us prevent bots and automated spam accounts.'
      )
      .setFooter({ text: 'Verification is required to access this server.' });

    const button = new ButtonBuilder()
      .setCustomId('verify_button')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });

    // Save verification role
    await prisma.guildSettings.upsert({
      where: { guildId: channel.guild.id },
      create: { guildId: channel.guild.id, verifiedRoleId: roleId },
      update: { verifiedRoleId: roleId },
    });

    logger.info(
      `Verification setup in ${channel.guild.name} with role ${roleId}`
    );
  }

  /**
   * Handle verification button click
   */
  static async handleVerification(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild || !interaction.member) return;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guild.id },
    });

    if (!settings?.verifiedRoleId) {
      await interaction.reply({
        content: '❌ Verification is not configured for this server.',
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const role = interaction.guild.roles.cache.get(settings.verifiedRoleId);

    if (!role) {
      await interaction.reply({
        content: '❌ Verification role not found. Please contact an administrator.',
        ephemeral: true,
      });
      return;
    }

    // Check if already verified
    if (member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: '✅ You are already verified!',
        ephemeral: true,
      });
      return;
    }

    try {
      // Add verified role
      await member.roles.add(role, 'Button verification');

      // Assign auto-roles now that they're verified
      await AutoRoleModule.assignRoles(member, true);

      await interaction.reply({
        content: '✅ You have been verified! Welcome to the server.',
        ephemeral: true,
      });

      logger.info(`${member.user.tag} verified in ${interaction.guild.name}`);
    } catch (error) {
      logger.error('Verification failed:', error);
      await interaction.reply({
        content: '❌ Verification failed. Please contact a moderator.',
        ephemeral: true,
      });
    }
  }

  /**
   * Disable verification for a guild
   */
  static async disableVerification(guildId: string): Promise<void> {
    await prisma.guildSettings.update({
      where: { guildId },
      data: { verifiedRoleId: null },
    });
  }

  /**
   * Check if verification is enabled
   */
  static async isEnabled(guildId: string): Promise<boolean> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });
    return !!settings?.verifiedRoleId;
  }
}
