import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { prisma } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('setmultiplier')
    .setDescription('Configure XP multipliers for roles')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set XP multiplier for a role')
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('Role to set multiplier for')
            .setRequired(true)
        )
        .addNumberOption((opt) =>
          opt
            .setName('multiplier')
            .setDescription('XP multiplier (1.0 = normal, 2.0 = double XP)')
            .setRequired(true)
            .setMinValue(0.1)
            .setMaxValue(10)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove XP multiplier from a role')
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('Role to remove multiplier from')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all XP multipliers')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    // Ensure guild exists
    await ensureGuild(guildId, interaction.guild!.name);

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    const multipliers: Record<string, number> = 
      (settings?.xpMultipliers as Record<string, number>) || {};

    if (subcommand === 'set') {
      const role = interaction.options.getRole('role', true);
      const multiplier = interaction.options.getNumber('multiplier', true);

      // Don't allow setting multiplier for @everyone
      if (role.id === guildId) {
        await interaction.reply({
          content: '❌ Cannot set multiplier for @everyone role.',
          ephemeral: true,
        });
        return;
      }

      multipliers[role.id] = multiplier;

      await prisma.guildSettings.upsert({
        where: { guildId },
        create: { guildId, xpMultipliers: multipliers },
        update: { xpMultipliers: multipliers },
      });

      const emoji = multiplier > 1 ? '⬆️' : multiplier < 1 ? '⬇️' : '➡️';
      await interaction.reply(
        `✅ ${emoji} Set **${multiplier}x** XP multiplier for ${role}.\n` +
        `Users with this role will earn ${multiplier === 1 ? 'normal' : `${multiplier}x`} XP.`
      );
    } else if (subcommand === 'remove') {
      const role = interaction.options.getRole('role', true);

      if (!multipliers[role.id]) {
        await interaction.reply({
          content: `❌ ${role} doesn't have a custom multiplier.`,
          ephemeral: true,
        });
        return;
      }

      delete multipliers[role.id];

      await prisma.guildSettings.update({
        where: { guildId },
        data: { xpMultipliers: multipliers },
      });

      await interaction.reply(`✅ Removed XP multiplier from ${role}. They will now earn normal XP.`);
    } else if (subcommand === 'list') {
      const entries = Object.entries(multipliers);

      if (entries.length === 0) {
        await interaction.reply({
          content: 'No XP multipliers configured. All roles earn 1x XP.',
          ephemeral: true,
        });
        return;
      }

      // Sort by multiplier (highest first)
      entries.sort((a, b) => b[1] - a[1]);

      const list = entries
        .map(([roleId, mult]) => {
          const emoji = mult > 1 ? '⬆️' : mult < 1 ? '⬇️' : '➡️';
          return `${emoji} <@&${roleId}> - **${mult}x**`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('⚡ XP Multipliers')
        .setDescription(list)
        .setFooter({ text: `${entries.length} multiplier(s) configured` })
        .addFields({
          name: 'ℹ️ How it works',
          value: 'Users with multiple multiplier roles get the highest multiplier applied.',
        });

      await interaction.reply({ embeds: [embed] });
    }
  },
});
