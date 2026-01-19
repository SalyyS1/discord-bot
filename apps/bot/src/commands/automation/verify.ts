import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { VerificationModule } from '../../modules/security/verification.js';
import { prisma } from '../../lib/prisma.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Configure button verification')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Setup verification in a channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to send verification message')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('Role to give when verified')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable verification system')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show verification status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    switch (subcommand) {
      case 'setup': {
        const channel = interaction.options.getChannel('channel', true) as TextChannel;
        const role = interaction.options.getRole('role', true);

        // Check bot can manage this role
        const botMember = interaction.guild!.members.me;
        if (botMember && role.position >= botMember.roles.highest.position) {
          await interaction.reply({
            content: '❌ I cannot assign this role (it is higher than my highest role).',
            ephemeral: true,
          });
          return;
        }

        // Check if role is @everyone
        if (role.id === interaction.guild!.id) {
          await interaction.reply({
            content: '❌ Cannot use @everyone as the verification role.',
            ephemeral: true,
          });
          return;
        }

        // Check bot can send messages in channel
        if (!channel.permissionsFor(botMember!)?.has('SendMessages')) {
          await interaction.reply({
            content: '❌ I cannot send messages in that channel.',
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
          await VerificationModule.setupVerification(channel, role.id);
          await interaction.editReply({
            content: `✅ Verification setup complete!\n\n` +
              `**Channel:** <#${channel.id}>\n` +
              `**Role:** <@&${role.id}>\n\n` +
              `Users who click the verify button will receive the ${role} role.`,
          });
        } catch (error) {
          await interaction.editReply('❌ Failed to setup verification. Check bot permissions.');
        }
        break;
      }

      case 'disable': {
        await VerificationModule.disableVerification(guildId);
        await interaction.reply(
          '✅ Verification disabled. The verification message will remain but clicking the button will no longer work.'
        );
        break;
      }

      case 'status': {
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId },
        });

        const isEnabled = !!settings?.verifiedRoleId;
        const role = settings?.verifiedRoleId
          ? interaction.guild!.roles.cache.get(settings.verifiedRoleId)
          : null;

        const embed = new EmbedBuilder()
          .setColor(isEnabled ? 0x00ff00 : 0xff0000)
          .setTitle('✅ Verification Status')
          .addFields({
            name: 'Status',
            value: isEnabled ? '✅ Enabled' : '❌ Disabled',
            inline: true,
          });

        if (isEnabled && role) {
          embed.addFields({
            name: 'Verified Role',
            value: `<@&${role.id}>`,
            inline: true,
          });
          embed.setDescription(
            'New members must click the verification button to access the server.\n' +
              'Auto-roles will be assigned after verification.'
          );
        } else if (isEnabled && !role) {
          embed.addFields({
            name: '⚠️ Warning',
            value: 'Verification role not found! Please reconfigure.',
          });
        }

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
});
