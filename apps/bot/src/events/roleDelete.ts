import { Events, Role } from 'discord.js';
import { Event } from '../structures/Event.js';
import { AntiRaidModule } from '../modules/security/antiRaid.js';
import { logger } from '../utils/logger.js';

/**
 * Role delete event handler
 * Triggers anti-raid protection for mass role deletion
 */
export default new Event({
  name: Events.GuildRoleDelete,
  async execute(role: Role) {
    try {
      await AntiRaidModule.onRoleDelete(role);
    } catch (error) {
      logger.error('roleDelete handler error:', error);
    }
  },
});
