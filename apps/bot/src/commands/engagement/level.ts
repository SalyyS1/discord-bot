import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../structures/Command.js';
import { LevelingModule } from '../../modules/leveling/index.js';
import { getXpProgress, getTotalXpForLevel } from '../../modules/leveling/xpCalculator.js';

/**
 * Generate a progress bar like owo bot style
 */
function generateProgressBar(percentage: number, length: number = 20): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  // Use different characters for filled/empty
  const filledChar = '▰';
  const emptyChar = '▱';

  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Format large numbers with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

export default new Command({
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level, XP, and progress to next level')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to check (leave empty for yourself)')
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    if (!member) {
      await interaction.reply({
        content: '❌ User not found in this server.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      // Get member XP data
      const data = await LevelingModule.getMemberData(
        interaction.guild!.id,
        target.id
      );

      const totalXp = data?.xp ?? 0;
      const level = data?.level ?? 0;
      const rank = await LevelingModule.getRank(interaction.guild!.id, target.id);

      // Calculate progress
      const progress = getXpProgress(totalXp);
      const progressBar = generateProgressBar(progress.percentage, 15);

      // XP needed for current level total
      const currentLevelTotalXp = getTotalXpForLevel(level);
      const nextLevelTotalXp = getTotalXpForLevel(level + 1);

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
          name: `${target.username}'s Level`,
          iconURL: target.displayAvatarURL({ size: 128 }),
        })
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: '📊 Level',
            value: `\`\`\`${level}\`\`\``,
            inline: true,
          },
          {
            name: '🏆 Rank',
            value: `\`\`\`#${rank || 'N/A'}\`\`\``,
            inline: true,
          },
          {
            name: '✨ Total XP',
            value: `\`\`\`${formatNumber(totalXp)}\`\`\``,
            inline: true,
          },
          {
            name: `📈 Progress to Level ${level + 1}`,
            value: [
              `${progressBar} **${progress.percentage}%**`,
              ``,
              `\`${formatNumber(progress.current)}\` / \`${formatNumber(progress.needed)}\` XP`,
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({
          text: `${formatNumber(nextLevelTotalXp - totalXp)} XP needed for Level ${level + 1}`,
        })
        .setTimestamp();

      // Add role rewards info if available
      const nextRoleReward = await getNextRoleReward(interaction.guild!.id, level);
      if (nextRoleReward) {
        embed.addFields({
          name: '🎁 Next Reward',
          value: `<@&${nextRoleReward.roleId}> at Level **${nextRoleReward.level}**`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /level command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching level data.',
      });
    }
  },
});

/**
 * Get the next role reward for the user
 */
async function getNextRoleReward(
  guildId: string,
  currentLevel: number
): Promise<{ roleId: string; level: number } | null> {
  try {
    const { prisma } = await import('@repo/database');

    const nextReward = await prisma.levelRole.findFirst({
      where: {
        guildId,
        level: {
          gt: currentLevel,
        },
      },
      orderBy: {
        level: 'asc',
      },
    });

    if (nextReward && nextReward.roleId) {
      return {
        roleId: nextReward.roleId,
        level: nextReward.level,
      };
    }

    return null;
  } catch {
    return null;
  }
}
