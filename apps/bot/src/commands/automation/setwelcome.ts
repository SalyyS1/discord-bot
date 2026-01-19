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
    .setName('setwelcome')
    .setDescription('Configure welcome messages')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set welcome channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Welcome channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set welcome message')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Welcome message ({user}, {username}, {server}, {count})')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('image')
        .setDescription('Toggle welcome image')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable images').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable welcome messages')
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription('Send a test welcome message')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show current welcome configuration')
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
          data: { welcomeChannelId: channel.id },
        });
        await interaction.reply(`✅ Welcome channel set to <#${channel.id}>`);
        break;
      }

      case 'message': {
        const message = interaction.options.getString('message', true);
        // Prevent @everyone/@here mentions
        if (message.includes('@everyone') || message.includes('@here')) {
          await interaction.reply({
            content: '❌ Welcome message cannot contain @everyone or @here.',
            ephemeral: true,
          });
          return;
        }
        await prisma.guildSettings.update({
          where: { guildId: interaction.guild!.id },
          data: { welcomeMessage: message },
        });
        await interaction.reply({
          content: `✅ Welcome message updated.\n\n**Preview:** ${message
            .replace(/{user}/g, `<@${interaction.user.id}>`)
            .replace(/{username}/g, interaction.user.username)
            .replace(/{server}/g, interaction.guild!.name)
            .replace(/{count}/g, interaction.guild!.memberCount.toString())}`,
        });
        break;
      }

      case 'image': {
        const enabled = interaction.options.getBoolean('enabled', true);
        await prisma.guildSettings.update({
          where: { guildId: interaction.guild!.id },
          data: { welcomeImageEnabled: enabled },
        });
        await interaction.reply(
          `✅ Welcome images ${enabled ? 'enabled' : 'disabled'}.`
        );
        break;
      }

      case 'disable': {
        await prisma.guildSettings.update({
          where: { guildId: interaction.guild!.id },
          data: { welcomeChannelId: null },
        });
        await interaction.reply('✅ Welcome messages disabled.');
        break;
      }

      case 'test': {
        const { WelcomeModule } = await import(
          '../../modules/welcome/index.js'
        );
        const member = interaction.guild!.members.cache.get(interaction.user.id);
        if (member) {
          await WelcomeModule.sendWelcome(member);
          await interaction.reply({
            content: '✅ Test welcome message sent!',
            ephemeral: true,
          });
        }
        break;
      }

      case 'status': {
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId: interaction.guild!.id },
        });

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('👋 Welcome Configuration')
          .addFields(
            {
              name: 'Channel',
              value: settings?.welcomeChannelId
                ? `<#${settings.welcomeChannelId}>`
                : 'Not set',
              inline: true,
            },
            {
              name: 'Images',
              value: settings?.welcomeImageEnabled ? 'Enabled' : 'Disabled',
              inline: true,
            },
            {
              name: 'Message',
              value:
                settings?.welcomeMessage?.slice(0, 500) ??
                'Default: Welcome {user} to **{server}**!',
            }
          );

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
});
