import { REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Command } from '../structures/Command.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function deployCommands() {
  const commands: unknown[] = [];
  const commandsPath = join(__dirname, '..', 'commands');

  let categories: string[];
  try {
    categories = await readdir(commandsPath);
  } catch {
    logger.error('No commands directory found');
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
          commands.push(command.data.toJSON());
        }
      } catch (err) {
        logger.error(`Failed to load command ${file}:`, err);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    logger.info(`Deploying ${commands.length} commands...`);

    if (config.discord.devGuildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.devGuildId),
        { body: commands }
      );
      logger.info('Commands deployed to dev guild');
    }

    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commands,
    });
    logger.info('Commands deployed globally');
  } catch (error) {
    logger.error('Failed to deploy commands:', error);
  }
}

deployCommands();
