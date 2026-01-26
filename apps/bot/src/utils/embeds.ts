import { EmbedBuilder, User, GuildMember } from 'discord.js';
import { COLORS } from '../config/constants.js';

/**
 * Pre-built embed templates for consistent styling
 */
export const Embeds = {
  /**
   * Success embed (green)
   */
  success(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`✅ ${title}`)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  /**
   * Error embed (red)
   */
  error(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  /**
   * Warning embed (orange)
   */
  warning(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle(`⚠️ ${title}`)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  /**
   * Info embed (blurple)
   */
  info(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(title)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  /**
   * Moderation action embed
   */
  modAction(params: {
    action: string;
    target: User | GuildMember;
    moderator: User | GuildMember;
    reason?: string;
    duration?: string;
  }): EmbedBuilder {
    const targetUser = 'user' in params.target ? params.target.user : params.target;
    const modUser = 'user' in params.moderator ? params.moderator.user : params.moderator;

    const embed = new EmbedBuilder()
      .setColor(COLORS.MODERATION)
      .setTitle(`🔨 ${params.action}`)
      .addFields(
        { name: 'User', value: targetUser.tag, inline: true },
        { name: 'Moderator', value: modUser.tag, inline: true }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    if (params.reason) {
      embed.addFields({ name: 'Reason', value: params.reason });
    }

    if (params.duration) {
      embed.addFields({ name: 'Duration', value: params.duration, inline: true });
    }

    return embed;
  },

  /**
   * Level up embed
   */
  levelUp(member: GuildMember, level: number, roles?: string[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(COLORS.LEVEL_UP)
      .setTitle('🎉 Level Up!')
      .setDescription(`Congratulations ${member}! You've reached **Level ${level}**!`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    if (roles && roles.length > 0) {
      embed.addFields({
        name: '🏆 New Roles',
        value: roles.join(', '),
      });
    }

    return embed;
  },

  /**
   * Giveaway embed
   */
  giveaway(params: {
    prize: string;
    hostTag: string;
    endsAt: Date;
    entryCount?: number;
    ended?: boolean;
    winners?: string[];
  }): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(COLORS.GIVEAWAY)
      .setTitle(params.ended ? '🎊 Giveaway Ended' : '🎉 Giveaway')
      .setDescription(params.prize)
      .addFields(
        { name: 'Host', value: params.hostTag, inline: true }
      )
      .setTimestamp(params.endsAt);

    if (params.ended && params.winners) {
      embed.addFields({
        name: '🏆 Winners',
        value: params.winners.length > 0 ? params.winners.join('\n') : 'No valid entries',
      });
    } else if (params.entryCount !== undefined) {
      embed.addFields({
        name: 'Entries',
        value: `${params.entryCount}`,
        inline: true,
      });
      embed.setFooter({ text: 'Click the button to enter!' });
    }

    return embed;
  },
};
