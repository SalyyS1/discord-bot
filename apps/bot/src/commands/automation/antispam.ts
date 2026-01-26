import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { AntiSpamModule } from '../../modules/security/antiSpam.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Configure anti-spam protection')
    .addSubcommand((sub) =>
      sub.setName('enable').setDescription('Enable anti-spam protection')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable anti-spam protection')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show anti-spam status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild!.id;

    switch (subcommand) {
      case 'enable': {
        await AntiSpamModule.setEnabled(guildId, interaction.guild!.name, true);
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle('✅ Anti-Spam Enabled')
              .setDescription(
                'Anti-spam protection is now active with the following settings:'
              )
              .addFields(
                { name: 'Rate Limit', value: '5 messages per 5 seconds', inline: true },
                { name: 'Duplicate Detection', value: '3 identical messages', inline: true },
                { name: 'Warning Threshold', value: '3 violations', inline: true },
                { name: 'Mute Threshold', value: '5 violations (10 min timeout)', inline: true }
              )
              .setFooter({ text: 'Users with Manage Messages permission are exempt' }),
          ],
        });
        break;
      }

      case 'disable': {
        await AntiSpamModule.setEnabled(guildId, interaction.guild!.name, false);
        await interaction.reply('✅ Anti-spam protection disabled.');
        break;
      }

      case 'status': {
        const { prisma } = await import('../../lib/prisma.js');
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId },
        });

        const embed = new EmbedBuilder()
          .setColor(settings?.antiSpamEnabled ? 0x00ff00 : 0xff0000)
          .setTitle('🚫 Anti-Spam Status')
          .addFields({
            name: 'Status',
            value: settings?.antiSpamEnabled ? '✅ Enabled' : '❌ Disabled',
          });

        if (settings?.antiSpamEnabled) {
          embed.addFields(
            { name: 'Rate Limit', value: '5 messages / 5 seconds', inline: true },
            { name: 'Duplicate Threshold', value: '3 messages', inline: true },
            { name: 'Warn After', value: '3 violations', inline: true },
            { name: 'Mute After', value: '5 violations', inline: true }
          );
          embed.setDescription(
            'Spammers will be warned, then muted automatically.\n' +
              'Users with **Manage Messages** permission are exempt.'
          );
        }

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
});
