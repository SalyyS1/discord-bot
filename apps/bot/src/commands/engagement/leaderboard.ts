import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { LeaderboardModule } from '../../modules/leveling/leaderboard.js';

export default new Command({
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the XP leaderboard')
    .addIntegerOption((opt) =>
      opt.setName('page').setDescription('Page number').setMinValue(1)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const page = interaction.options.getInteger('page') ?? 1;
    const perPage = 10;
    const offset = (page - 1) * perPage;

    // Get entries (fetch enough to cover the requested page)
    const entries = await LeaderboardModule.getTopMembers(
      interaction.guild!.id,
      offset + perPage
    );

    const pageEntries = entries.slice(offset, offset + perPage);

    if (pageEntries.length === 0) {
      await interaction.editReply('❌ No data for this page.');
      return;
    }

    // Build leaderboard description
    const descriptionLines = await Promise.all(
      pageEntries.map(async (entry) => {
        const user = await interaction.client.users
          .fetch(entry.discordId)
          .catch(() => null);
        const username = user?.username ?? 'Unknown User';
        const medal =
          entry.rank <= 3
            ? ['🥇', '🥈', '🥉'][entry.rank - 1]
            : `**#${entry.rank}**`;
        return `${medal} ${username} - Level ${entry.level} (${entry.xp.toLocaleString()} XP)`;
      })
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏆 ${interaction.guild!.name} Leaderboard`)
      .setDescription(descriptionLines.join('\n'))
      .setFooter({ text: `Page ${page}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
});
