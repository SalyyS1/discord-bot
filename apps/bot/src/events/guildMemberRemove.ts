import { Events, EmbedBuilder, GuildMember, PartialGuildMember, AuditLogEvent } from 'discord.js';
import { Event } from '../structures/Event.js';
import { LoggingService } from '../services/logging.js';
import { WelcomeModule } from '../modules/welcome/index.js';
import { AntiRaidModule } from '../modules/security/antiRaid.js';
import { logger } from '../utils/logger.js';

export default new Event({
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    // Send goodbye message
    await WelcomeModule.sendGoodbye(member);

    // Check if this was a kick (for anti-raid)
    try {
      // Wait a bit for audit log to be created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
        limit: 1,
      });

      const kickLog = auditLogs.entries.first();
      
      // Check if kick was recent and for this user
      if (kickLog && 
          kickLog.target?.id === member.id && 
          kickLog.createdTimestamp > Date.now() - 5000) {
        // This was a kick, check anti-raid
        await AntiRaidModule.onMemberKick(member.guild, member.id);
      }
    } catch (error) {
      logger.error('Failed to check kick audit log:', error);
    }

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
