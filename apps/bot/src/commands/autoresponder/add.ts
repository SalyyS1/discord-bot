import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { AutoResponderModule } from '../../modules/autoresponder/index.js';
import { TriggerType, ResponseType } from '../../lib/prisma.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('autoresponder-add')
    .setDescription('Add an auto-responder trigger')
    .addStringOption((opt) =>
      opt.setName('trigger').setDescription('Trigger keyword/phrase').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('response').setDescription('Response message').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('trigger-type')
        .setDescription('How to match the trigger')
        .setRequired(false)
        .addChoices(
          { name: 'Contains', value: 'CONTAINS' },
          { name: 'Exact Match', value: 'EXACT' },
          { name: 'Starts With', value: 'STARTS_WITH' },
          { name: 'Ends With', value: 'ENDS_WITH' },
          { name: 'Regex', value: 'REGEX' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('response-type')
        .setDescription('Type of response')
        .setRequired(false)
        .addChoices(
          { name: 'Text', value: 'TEXT' },
          { name: 'Embed', value: 'EMBED' },
          { name: 'Reaction', value: 'REACTION' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('cooldown')
        .setDescription('Cooldown in seconds (0 = no cooldown)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(3600)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction) {
    const trigger = interaction.options.getString('trigger', true);
    const response = interaction.options.getString('response', true);
    const triggerType =
      (interaction.options.getString('trigger-type') as TriggerType) || TriggerType.CONTAINS;
    const responseType =
      (interaction.options.getString('response-type') as ResponseType) || ResponseType.TEXT;
    const cooldown = interaction.options.getInteger('cooldown') ?? 0;

    // Validate regex if needed
    if (triggerType === TriggerType.REGEX) {
      try {
        new RegExp(trigger);
      } catch {
        await interaction.reply({
          content: '❌ Invalid regex pattern.',
          ephemeral: true,
        });
        return;
      }
    }

    // Validate reaction emoji if needed
    if (responseType === ResponseType.REACTION) {
      // Basic emoji validation
      const emojiRegex = /^[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|<:[a-zA-Z0-9_]+:\d+>$/u;
      if (!emojiRegex.test(response)) {
        await interaction.reply({
          content: '❌ Invalid emoji for reaction response.',
          ephemeral: true,
        });
        return;
      }
    }

    try {
      const id = await AutoResponderModule.add(
        interaction.guild!.id,
        trigger,
        response,
        triggerType,
        responseType,
        cooldown
      );

      await interaction.reply({
        content:
          `✅ **Auto-responder added!**\n\n` +
          `• Trigger: \`${trigger}\`\n` +
          `• Type: ${AutoResponderModule.getTriggerTypeName(triggerType)}\n` +
          `• Response Type: ${responseType}\n` +
          `• Cooldown: ${cooldown}s\n` +
          `• ID: \`${id.slice(0, 8)}\``,
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: '❌ Failed to add auto-responder.',
        ephemeral: true,
      });
    }
  },
});
