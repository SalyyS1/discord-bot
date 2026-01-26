import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  CategoryChannel,
  VoiceChannel,
} from 'discord.js';
import { Command } from '../../structures/Command.js';
import { TempVoiceModule } from '../../modules/tempvoice/index.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('tempvoice-setup')
    .setDescription('Setup temporary voice channels')
    .addChannelOption((opt) =>
      opt
        .setName('creator')
        .setDescription('The voice channel users join to create temp channels')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('category')
        .setDescription('Category where temp channels will be created')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('name-template')
        .setDescription('Default channel name ({user} = username)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  permissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction) {
    const creator = interaction.options.getChannel('creator', true) as VoiceChannel;
    const category = interaction.options.getChannel('category', true) as CategoryChannel;
    const nameTemplate = interaction.options.getString('name-template') ?? "{user}'s Channel";

    await interaction.deferReply({ ephemeral: true });

    try {
      await TempVoiceModule.setup(
        interaction.guild!,
        creator.id,
        category.id,
        nameTemplate
      );

      await interaction.editReply(
        `✅ **Temp Voice Setup Complete**\n\n` +
          `• Creator Channel: ${creator}\n` +
          `• Category: ${category.name}\n` +
          `• Name Template: \`${nameTemplate}\`\n\n` +
          `Users who join ${creator} will have a temporary voice channel created for them.`
      );
    } catch {
      await interaction.editReply('❌ Failed to setup temp voice system.');
    }
  },
});
