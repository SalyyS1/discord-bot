import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { prisma } from '../../lib/prisma.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('setgoodbye')
    .setDescription('Configure goodbye messages')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set goodbye channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Goodbye channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set goodbye message')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Goodbye message ({username}, {tag}, {server}, {count})')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('image')
        .setDescription('Toggle goodbye image')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable images').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable goodbye messages')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show current goodbye configuration')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // Ensure guild settings exist
    await prisma.guildSettings.upsert({
      where: { guildId: interaction.guild!.id },
      create: { guildId: interaction.guild!.id },
      update: {},
    });

    switch (subcommand) {
      case 'channel': {
        const channel = interaction.options.getChannel('channel', true);
        await prisma.guildSettings.update({
          where: { guildId: interaction.guild!.id },
          data: { goodbyeChannelId: channel.id },
        });
        await interaction.reply(`✅ Goodbye channel set to <#${channel.id}>`);
        break;
      }

      case 'message': {
        const message = interaction.options.getString('message', true);
        // Prevent @everyone/@here mentions
        if (message.includes('@everyone') || message.includes('@here')) {
          await interaction.reply({
            content: '❌ Goodbye message cannot contain @everyone or @here.',
            ephemeral: true,
          });
          return;
        }
        await prisma.guildSettings.update({
          where: { guildId: interaction.guild!.id },
          data: { goodbyeMessage: message },
        });
        await interaction.reply({
          content: `✅ Goodbye message updated.\n\n**Preview:** ${message
            .replace(/{username}/g, interaction.user.username)
            .replace(/{tag}/g, interaction.user.tag)
            .replace(/{server}/g, interaction.guild!.name)
            .replace(/{count}/g, interaction.guild!.memberCount.toString())}`,
        });
        break;
      }

      case 'image': {
        const enabled = interaction.options.getBoolean('enabled', true);
        await prisma.guildSettings.update({
          where: { guildId: interaction.guild!.id },
          data: { goodbyeImageEnabled: enabled },
        });
        await interaction.reply(
          `✅ Goodbye images ${enabled ? 'enabled' : 'disabled'}.`
        );
        break;
      }

      case 'disable': {
        await prisma.guildSettings.update({
          where: { guildId: interaction.guild!.id },
          data: { goodbyeChannelId: null },
        });
        await interaction.reply('✅ Goodbye messages disabled.');
        break;
      }

      case 'status': {
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId: interaction.guild!.id },
        });

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('👋 Goodbye Configuration')
          .addFields(
            {
              name: 'Channel',
              value: settings?.goodbyeChannelId
                ? `<#${settings.goodbyeChannelId}>`
                : 'Not set',
              inline: true,
            },
            {
              name: 'Images',
              value: settings?.goodbyeImageEnabled ? 'Enabled' : 'Disabled',
              inline: true,
            },
            {
              name: 'Message',
              value:
                settings?.goodbyeMessage?.slice(0, 500) ??
                'Default: **{username}** has left the server.',
            }
          );

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
});
