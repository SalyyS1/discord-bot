import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { client } from '../lib/client.js';
import { Command } from '../structures/Command.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(): Promise<void> {
  const commandsPath = join(__dirname, '..', 'commands');
  let categories: string[];

  try {
    categories = await readdir(commandsPath);
  } catch {
    logger.warn('No commands directory found');
    return;
  }

  for (const category of categories) {
    if (category.startsWith('_') || category.endsWith('.ts')) continue;

    const categoryPath = join(commandsPath, category);
    let files: string[];

    try {
      files = await readdir(categoryPath);
    } catch {
      continue;
    }

    for (const file of files) {
      if (file.startsWith('_') || !file.endsWith('.ts')) continue;

      try {
        const filePath = join(categoryPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);
        const command = module.default;

        if (command instanceof Command) {
          command.category = category;
          client.commands.set(command.data.name, command);
          logger.debug(`Loaded command: ${command.data.name} [${category}]`);
        }
      } catch (err) {
        logger.error(`Failed to load command ${file}:`, err);
      }
    }
  }

  logger.info(`Loaded ${client.commands.size} commands`);
}

export function getCommandsByCategory(): Map<string, Command[]> {
  const categories = new Map<string, Command[]>();

  for (const command of client.commands.values()) {
    const category = command.category;
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(command);
  }

  return categories;
}
