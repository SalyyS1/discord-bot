import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { AutoResponderModule } from '../../modules/autoresponder/index.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('autoresponder-list')
    .setDescription('List all auto-responder triggers')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction) {
    const triggers = await AutoResponderModule.list(interaction.guild!.id);

    if (triggers.length === 0) {
      await interaction.reply({
        content: '📭 No auto-responders configured.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('💬 Auto-Responders')
      .setDescription(`Found ${triggers.length} trigger(s)`)
      .setTimestamp();

    // Add fields for each trigger (max 25)
    const displayTriggers = triggers.slice(0, 25);
    for (const trigger of displayTriggers) {
      const status = trigger.enabled ? '✅' : '❌';
      const truncatedResponse =
        trigger.response.length > 50
          ? trigger.response.slice(0, 47) + '...'
          : trigger.response;

      embed.addFields({
        name: `${status} ${trigger.trigger}`,
        value:
          `ID: \`${trigger.id.slice(0, 8)}\`\n` +
          `Type: ${AutoResponderModule.getTriggerTypeName(trigger.triggerType)}\n` +
          `Response: ${truncatedResponse}`,
        inline: true,
      });
    }

    if (triggers.length > 25) {
      embed.setFooter({ text: `Showing 25 of ${triggers.length} triggers` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
});
