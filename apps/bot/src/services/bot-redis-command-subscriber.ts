import type Redis from 'ioredis';
import { redis as mainRedis } from '../lib/redis.js';
import { logger } from '../utils/logger.js';

const CHANNEL = 'bot_commands';

let subscriber: Redis | null = null;

/**
 * Command message structure from dashboard
 */
interface BotCommand {
  type: string;
  guildId: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Command handlers registry
 */
type CommandHandler = (command: BotCommand) => void | Promise<void>;
const commandHandlers = new Map<string, CommandHandler>();

/**
 * Register a command handler
 */
export function registerCommandHandler(
  commandType: string,
  handler: CommandHandler
): void {
  commandHandlers.set(commandType, handler);
  logger.info(`[BotCommands] Registered handler for: ${commandType}`);
}

/**
 * Handle incoming command from dashboard
 */
async function handleCommand(message: string): Promise<void> {
  try {
    const command = JSON.parse(message) as BotCommand;
    const handler = commandHandlers.get(command.type);

    if (!handler) {
      logger.warn(`[BotCommands] No handler for command type: ${command.type}`);
      return;
    }

    logger.info(
      `[BotCommands] Processing ${command.type} for guild ${command.guildId}`
    );
    await handler(command);
  } catch (error) {
    logger.error('[BotCommands] Failed to handle command:', error);
  }
}

/**
 * Initialize bot commands subscriber
 */
export async function initBotCommandsSubscriber(): Promise<void> {
  if (subscriber) {
    logger.warn('[BotCommands] Subscriber already initialized');
    return;
  }

  try {
    subscriber = mainRedis.duplicate();

    subscriber.on('message', (channel, message) => {
      if (channel === CHANNEL) {
        handleCommand(message);
      }
    });

    await subscriber.subscribe(CHANNEL);
    logger.info('[BotCommands] Subscribed to dashboard commands');
  } catch (error) {
    logger.error('[BotCommands] Failed to initialize:', error);
  }
}

/**
 * Stop bot commands subscriber
 */
export async function stopBotCommandsSubscriber(): Promise<void> {
  if (subscriber) {
    await subscriber.unsubscribe(CHANNEL);
    subscriber.disconnect();
    subscriber = null;
    logger.info('[BotCommands] Unsubscribed from dashboard commands');
  }
}
