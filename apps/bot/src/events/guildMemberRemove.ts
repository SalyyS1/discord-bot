import { Events, EmbedBuilder, GuildMember, PartialGuildMember } from 'discord.js';
import { Event } from '../structures/Event.js';
import { LoggingService } from '../services/logging.js';
import { WelcomeModule } from '../modules/welcome/index.js';

export default new Event({
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    // Send goodbye message
    await WelcomeModule.sendGoodbye(member);

    // Logging
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('👋 Member Left')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag}`, inline: true },
        { name: 'ID', value: member.id, inline: true },
        {
          name: 'Joined',
          value: member.joinedAt?.toLocaleDateString() ?? 'Unknown',
          inline: true,
        },
        {
          name: 'Member Count',
          value: `${member.guild.memberCount}`,
          inline: true,
        }
      )
      .setTimestamp();

    await LoggingService.sendLog(member.guild, embed);
  },
});
