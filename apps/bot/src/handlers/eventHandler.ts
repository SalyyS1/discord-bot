import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { client } from '../lib/client.js';
import { Event } from '../structures/Event.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(): Promise<void> {
  const eventsPath = join(__dirname, '..', 'events');
  let files: string[];

  try {
    files = await readdir(eventsPath);
  } catch {
    logger.warn('No events directory found');
    return;
  }

  for (const file of files) {
    if (file.startsWith('_') || !file.endsWith('.ts')) continue;

    try {
      const filePath = join(eventsPath, file);
      const module = await import(filePath);
      const event = module.default;

      if (event instanceof Event) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        logger.debug(`Loaded event: ${event.name}`);
      }
    } catch (err) {
      logger.error(`Failed to load event ${file}:`, err);
    }
  }

  logger.info('Events loaded');
}
