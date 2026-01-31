import { Events, GuildChannel, DMChannel, Channel } from 'discord.js';
import { Event } from '../structures/Event.js';
import { AntiRaidModule } from '../modules/security/antiRaid.js';
import { logger } from '../utils/logger.js';

/**
 * Channel delete event handler
 * Triggers anti-raid protection for mass channel deletion
 */
export default new Event({
  name: Events.ChannelDelete,
  async execute(channel: Channel) {
    try {
      // Ignore DM channels
      if (channel.isDMBased()) return;

      // Cast to GuildChannel
      const guildChannel = channel as GuildChannel;

      // Check anti-raid
      await AntiRaidModule.onChannelDelete(guildChannel);
    } catch (error) {
      logger.error('channelDelete handler error:', error);
    }
  },
});
