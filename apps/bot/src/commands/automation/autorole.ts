import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { AutoRoleModule } from '../../modules/autorole/index.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Manage auto-roles for new members')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a role to auto-assign on join')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to auto-assign').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a role from auto-assign')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to remove').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all auto-roles')
    )
    .addSubcommand((sub) =>
      sub.setName('clear').setDescription('Remove all auto-roles')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  permissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    switch (subcommand) {
      case 'add': {
        const role = interaction.options.getRole('role', true);

        // Check bot can manage this role
        const botMember = interaction.guild!.members.me;
        if (
          botMember &&
          role.position >= botMember.roles.highest.position
        ) {
          await interaction.reply({
            content:
              '❌ I cannot assign this role (it is higher than my highest role).',
            ephemeral: true,
          });
          return;
        }

        // Check if role is @everyone
        if (role.id === interaction.guild!.id) {
          await interaction.reply({
            content: '❌ Cannot add @everyone as an auto-role.',
            ephemeral: true,
          });
          return;
        }

        const added = await AutoRoleModule.addAutoRole(guildId, role.id, interaction.guild!.name);
        if (!added) {
          await interaction.reply({
            content: `❌ ${role} is already an auto-role.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.reply(`✅ ${role} will now be auto-assigned to new members.`);
        break;
      }

      case 'remove': {
        const role = interaction.options.getRole('role', true);
        const removed = await AutoRoleModule.removeAutoRole(guildId, role.id);

        if (!removed) {
          await interaction.reply({
            content: `❌ ${role} is not an auto-role.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.reply(`✅ ${role} removed from auto-roles.`);
        break;
      }

      case 'list': {
        const roleIds = await AutoRoleModule.getAutoRoles(guildId);

        if (roleIds.length === 0) {
          await interaction.reply({
            content: 'No auto-roles configured.',
            ephemeral: true,
          });
          return;
        }

        const roles = roleIds
          .map((id) => {
            const role = interaction.guild!.roles.cache.get(id);
            return role ? `<@&${id}>` : `Unknown (${id})`;
          })
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('⚙️ Auto-Roles')
          .setDescription(roles)
          .setFooter({ text: `${roleIds.length} role(s) configured` });

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'clear': {
        const { prisma } = await import('../../lib/prisma.js');
        await prisma.guildSettings.update({
          where: { guildId },
          data: { autoRoleIds: [] },
        });
        await interaction.reply('✅ All auto-roles have been cleared.');
        break;
      }
    }
  },
});
