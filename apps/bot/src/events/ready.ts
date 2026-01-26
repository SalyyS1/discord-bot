import { Events, ActivityType } from 'discord.js';
import { Event } from '../structures/Event.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../lib/prisma.js';
import { AntiRaidModule } from '../modules/security/antiRaid.js';

export default new Event({
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Initialize Anti-Raid module
    AntiRaidModule.init(client);

    // Sync all guilds to database
    try {
      const guilds = client.guilds.cache;
      for (const [id, guild] of guilds) {
        await prisma.guild.upsert({
          where: { id },
          create: { id, name: guild.name },
          update: { name: guild.name, leftAt: null },
        });
      }
      logger.info(`Synced ${guilds.size} guilds to database`);
    } catch (error) {
      logger.error('Failed to sync guilds to database:', error);
    }

    client.user.setPresence({
      activities: [{ name: '/help', type: ActivityType.Listening }],
      status: 'online',
    });
  },
});
