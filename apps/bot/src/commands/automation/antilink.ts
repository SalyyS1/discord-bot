import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { AntiLinkModule } from '../../modules/security/antiLink.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Configure anti-link protection')
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable anti-link protection')
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable anti-link protection')
    )
    .addSubcommand((sub) =>
      sub
        .setName('whitelist')
        .setDescription('Add a domain to the whitelist')
        .addStringOption((opt) =>
          opt
            .setName('domain')
            .setDescription('Domain to whitelist (e.g., youtube.com)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('unwhitelist')
        .setDescription('Remove a domain from the whitelist')
        .addStringOption((opt) =>
          opt
            .setName('domain')
            .setDescription('Domain to remove')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List whitelisted domains')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show anti-link status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    switch (subcommand) {
      case 'enable': {
        // Check if already enabled
        const { prisma } = await import('../../lib/prisma.js');
        const currentSettings = await prisma.guildSettings.findUnique({
          where: { guildId },
          select: { antiLinkEnabled: true },
        });
        if (currentSettings?.antiLinkEnabled) {
          await interaction.reply({ content: '⚠️ Anti-link protection is already enabled.', ephemeral: true });
          return;
        }
        await AntiLinkModule.setEnabled(guildId, interaction.guild!.name, true);
        await interaction.reply('✅ Anti-link protection enabled. Links will be deleted and users warned.');
        break;
      }

      case 'disable': {
        // Check if already disabled
        const { prisma } = await import('../../lib/prisma.js');
        const currentSettings = await prisma.guildSettings.findUnique({
          where: { guildId },
          select: { antiLinkEnabled: true },
        });
        if (!currentSettings?.antiLinkEnabled) {
          await interaction.reply({ content: '⚠️ Anti-link protection is already disabled.', ephemeral: true });
          return;
        }
        await AntiLinkModule.setEnabled(guildId, interaction.guild!.name, false);
        await interaction.reply('✅ Anti-link protection disabled.');
        break;
      }

      case 'whitelist': {
        const domain = interaction.options.getString('domain', true);

        // Basic domain validation
        const cleanDomain = domain
          .toLowerCase()
          .replace(/^(https?:\/\/)?(www\.)?/, '')
          .split('/')[0];

        if (!cleanDomain.includes('.')) {
          await interaction.reply({
            content: '❌ Invalid domain format. Example: youtube.com',
            ephemeral: true,
          });
          return;
        }

        await AntiLinkModule.addToWhitelist(guildId, interaction.guild!.name, cleanDomain);
        await interaction.reply(`✅ \`${cleanDomain}\` added to whitelist. Links from this domain will be allowed.`);
        break;
      }

      case 'unwhitelist': {
        const domain = interaction.options.getString('domain', true);
        const cleanDomain = domain
          .toLowerCase()
          .replace(/^(https?:\/\/)?(www\.)?/, '')
          .split('/')[0];

        const removed = await AntiLinkModule.removeFromWhitelist(guildId, cleanDomain);
        if (!removed) {
          await interaction.reply({
            content: `❌ \`${cleanDomain}\` is not in the whitelist.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.reply(`✅ \`${cleanDomain}\` removed from whitelist.`);
        break;
      }

      case 'list': {
        const whitelist = await AntiLinkModule.getWhitelist(guildId);

        if (whitelist.length === 0) {
          await interaction.reply({
            content: 'No domains whitelisted. All links will be blocked when anti-link is enabled.',
            ephemeral: true,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔗 Whitelisted Domains')
          .setDescription(whitelist.map((d) => `• \`${d}\``).join('\n'))
          .setFooter({ text: `${whitelist.length} domain(s) whitelisted` });

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'status': {
        const { prisma } = await import('../../lib/prisma.js');
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId },
        });

        const embed = new EmbedBuilder()
          .setColor(settings?.antiLinkEnabled ? 0x00ff00 : 0xff0000)
          .setTitle('🔗 Anti-Link Status')
          .addFields(
            {
              name: 'Status',
              value: settings?.antiLinkEnabled ? '✅ Enabled' : '❌ Disabled',
              inline: true,
            },
            {
              name: 'Whitelisted Domains',
              value: `${settings?.antiLinkWhitelist?.length ?? 0}`,
              inline: true,
            }
          )
          .setDescription(
            settings?.antiLinkEnabled
              ? 'Links from non-whitelisted domains will be deleted.'
              : 'All links are currently allowed.'
          );

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
});
