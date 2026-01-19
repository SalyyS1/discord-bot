import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
} from 'discord.js';
import { logger } from '../../utils/logger.js';

interface ButtonRoleConfig {
  roleId: string;
  label: string;
  emoji?: string;
  style?: ButtonStyle;
}

/**
 * Self-assignable button roles module
 */
export class ButtonRolesModule {
  /**
   * Create button role message in channel
   */
  static async createButtonRoles(
    channel: TextChannel,
    title: string,
    description: string,
    roles: ButtonRoleConfig[]
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: 'Click a button to toggle the role' });

    // Create buttons (max 5 per row, max 5 rows = 25 buttons)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < roles.length && i < 25; i++) {
      const role = roles[i];

      const button = new ButtonBuilder()
        .setCustomId(`buttonrole_${role.roleId}`)
        .setLabel(role.label)
        .setStyle(role.style ?? ButtonStyle.Primary);

      if (role.emoji) {
        button.setEmoji(role.emoji);
      }

      currentRow.addComponents(button);

      // Start new row every 5 buttons
      if ((i + 1) % 5 === 0) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
      }
    }

    // Add remaining buttons
    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    await channel.send({ embeds: [embed], components: rows });
  }

  /**
   * Handle button role click - toggle role
   */
  static async handleButtonClick(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.customId.startsWith('buttonrole_')) return;

    const roleId = interaction.customId.replace('buttonrole_', '');
    const member = interaction.member as GuildMember;
    const guild = interaction.guild;

    if (!member || !guild) {
      await interaction.reply({
        content: '❌ Error processing request.',
        ephemeral: true,
      });
      return;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      await interaction.reply({
        content: '❌ Role not found. It may have been deleted.',
        ephemeral: true,
      });
      return;
    }

    // Check if bot can manage this role
    const botMember = guild.members.me;
    if (botMember && role.position >= botMember.roles.highest.position) {
      await interaction.reply({
        content: '❌ I cannot manage this role (permission issue).',
        ephemeral: true,
      });
      return;
    }

    try {
      const hasRole = member.roles.cache.has(roleId);

      if (hasRole) {
        await member.roles.remove(role, 'Button role toggle');
        await interaction.reply({
          content: `✅ Removed the **${role.name}** role.`,
          ephemeral: true,
        });
      } else {
        await member.roles.add(role, 'Button role toggle');
        await interaction.reply({
          content: `✅ Added the **${role.name}** role.`,
          ephemeral: true,
        });
      }
    } catch (error) {
      logger.error('Button role error:', error);
      await interaction.reply({
        content: '❌ Failed to toggle role. Check bot permissions.',
        ephemeral: true,
      });
    }
  }
}
