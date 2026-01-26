import { Events, Guild } from 'discord.js';
import { Event } from '../structures/Event.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../lib/prisma.js';

export default new Event({
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

    // Sync guild to database
    try {
      await prisma.guild.upsert({
        where: { id: guild.id },
        create: { id: guild.id, name: guild.name },
        update: { name: guild.name, leftAt: null },
      });
      logger.info(`Guild ${guild.name} synced to database`);
    } catch (error) {
      logger.error(`Failed to sync guild ${guild.name} to database:`, error);
    }
  },
});
