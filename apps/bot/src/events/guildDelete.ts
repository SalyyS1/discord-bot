import { Events, Guild } from 'discord.js';
import { Event } from '../structures/Event.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../lib/prisma.js';

export default new Event({
  name: Events.GuildDelete,
  async execute(guild: Guild) {
    logger.info(`Left guild: ${guild.name} (${guild.id})`);

    // Mark guild as left in database
    try {
      await prisma.guild.update({
        where: { id: guild.id },
        data: { leftAt: new Date() },
      });
      logger.info(`Guild ${guild.name} marked as left in database`);
    } catch (error) {
      logger.error(`Failed to update guild ${guild.name} in database:`, error);
    }
  },
});
