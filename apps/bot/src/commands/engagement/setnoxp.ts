import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { prisma } from '../../lib/prisma.js';
import { ensureGuild } from '../../lib/settings.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('setnoxp')
    .setDescription('Configure channels and roles that do not earn XP')
    .addSubcommandGroup((group) =>
      group
        .setName('channel')
        .setDescription('Manage No-XP channels')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a channel where users cannot earn XP')
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Channel to exclude from XP')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a channel from No-XP list')
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Channel to remove')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub.setName('list').setDescription('List all No-XP channels')
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('role')
        .setDescription('Manage No-XP roles')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a role that cannot earn XP')
            .addRoleOption((opt) =>
              opt
                .setName('role')
                .setDescription('Role to exclude from XP')
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a role from No-XP list')
            .addRoleOption((opt) =>
              opt
                .setName('role')
                .setDescription('Role to remove')
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub.setName('list').setDescription('List all No-XP roles')
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);
    const guildId = interaction.guild!.id;

    // Ensure guild exists
    await ensureGuild(guildId, interaction.guild!.name);

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    if (group === 'channel') {
      const noXpChannels = new Set(settings?.noXpChannelIds || []);

      if (subcommand === 'add') {
        const channel = interaction.options.getChannel('channel', true);
        
        if (noXpChannels.has(channel.id)) {
          await interaction.reply({
            content: `❌ ${channel} is already a No-XP channel.`,
            ephemeral: true,
          });
          return;
        }

        noXpChannels.add(channel.id);

        await prisma.guildSettings.upsert({
          where: { guildId },
          create: { guildId, noXpChannelIds: Array.from(noXpChannels) },
          update: { noXpChannelIds: Array.from(noXpChannels) },
        });

        await interaction.reply(`✅ ${channel} added to No-XP channels. Users will not earn XP in this channel.`);
      } else if (subcommand === 'remove') {
        const channel = interaction.options.getChannel('channel', true);
        
        if (!noXpChannels.has(channel.id)) {
          await interaction.reply({
            content: `❌ ${channel} is not a No-XP channel.`,
            ephemeral: true,
          });
          return;
        }

        noXpChannels.delete(channel.id);

        await prisma.guildSettings.update({
          where: { guildId },
          data: { noXpChannelIds: Array.from(noXpChannels) },
        });

        await interaction.reply(`✅ ${channel} removed from No-XP channels.`);
      } else if (subcommand === 'list') {
        if (noXpChannels.size === 0) {
          await interaction.reply({
            content: 'No channels are excluded from XP. All text channels earn XP.',
            ephemeral: true,
          });
          return;
        }

        const channelList = Array.from(noXpChannels)
          .map((id) => `<#${id}>`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🚫 No-XP Channels')
          .setDescription(channelList)
          .setFooter({ text: `${noXpChannels.size} channel(s) excluded` });

        await interaction.reply({ embeds: [embed] });
      }
    } else if (group === 'role') {
      const noXpRoles = new Set(settings?.noXpRoleIds || []);

      if (subcommand === 'add') {
        const role = interaction.options.getRole('role', true);
        
        if (noXpRoles.has(role.id)) {
          await interaction.reply({
            content: `❌ ${role} is already a No-XP role.`,
            ephemeral: true,
          });
          return;
        }

        noXpRoles.add(role.id);

        await prisma.guildSettings.upsert({
          where: { guildId },
          create: { guildId, noXpRoleIds: Array.from(noXpRoles) },
          update: { noXpRoleIds: Array.from(noXpRoles) },
        });

        await interaction.reply(`✅ ${role} added to No-XP roles. Users with this role will not earn XP.`);
      } else if (subcommand === 'remove') {
        const role = interaction.options.getRole('role', true);
        
        if (!noXpRoles.has(role.id)) {
          await interaction.reply({
            content: `❌ ${role} is not a No-XP role.`,
            ephemeral: true,
          });
          return;
        }

        noXpRoles.delete(role.id);

        await prisma.guildSettings.update({
          where: { guildId },
          data: { noXpRoleIds: Array.from(noXpRoles) },
        });

        await interaction.reply(`✅ ${role} removed from No-XP roles.`);
      } else if (subcommand === 'list') {
        if (noXpRoles.size === 0) {
          await interaction.reply({
            content: 'No roles are excluded from XP. All users can earn XP.',
            ephemeral: true,
          });
          return;
        }

        const roleList = Array.from(noXpRoles)
          .map((id) => `<@&${id}>`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🚫 No-XP Roles')
          .setDescription(roleList)
          .setFooter({ text: `${noXpRoles.size} role(s) excluded` });

        await interaction.reply({ embeds: [embed] });
      }
    }
  },
});
