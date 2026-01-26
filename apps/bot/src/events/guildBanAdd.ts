import { Events, GuildBan } from 'discord.js';
import { Event } from '../structures/Event.js';
import { AntiRaidModule } from '../modules/security/antiRaid.js';
import { logger } from '../utils/logger.js';

/**
 * Guild ban add event handler
 * Triggers anti-raid protection for mass banning
 */
export default new Event({
  name: Events.GuildBanAdd,
  async execute(ban: GuildBan) {
    try {
      await AntiRaidModule.onMemberBan(ban.guild, ban.user.id);
    } catch (error) {
      logger.error('guildBanAdd handler error:', error);
    }
  },
});
