import { Events, ActivityType } from 'discord.js';
import { Event } from '../structures/Event.js';
import { logger } from '../utils/logger.js';

export default new Event({
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    client.user.setPresence({
      activities: [{ name: '/help', type: ActivityType.Listening }],
      status: 'online',
    });
  },
});
