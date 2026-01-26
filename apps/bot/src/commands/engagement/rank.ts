import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { LevelingModule } from '../../modules/leveling/index.js';
import { generateRankCard } from '../../modules/leveling/rankCard.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("View your or another member's rank")
    .addUserOption((opt) =>
      opt.setName('member').setDescription('Member to check')
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('member') ?? interaction.user;
    const member = interaction.guild!.members.cache.get(target.id);

    if (!member) {
      await interaction.reply({
        content: '❌ Member not found.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    // Get member XP data
    const data = await LevelingModule.getMemberData(
      interaction.guild!.id,
      target.id
    );

    const xp = data?.xp ?? 0;
    const level = data?.level ?? 0;
    const rank = await LevelingModule.getRank(interaction.guild!.id, target.id);

    try {
      // Generate rank card
      const cardBuffer = await generateRankCard(member, xp, level, rank || 0);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'rank.png' });

      await interaction.editReply({ files: [attachment] });
    } catch {
      await interaction.editReply(
        `**${target.username}**\nRank: #${rank || 'N/A'} | Level: ${level} | XP: ${xp.toLocaleString()}`
      );
    }
  },
});
