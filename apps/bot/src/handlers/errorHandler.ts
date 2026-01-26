import { ChatInputCommandInteraction, EmbedBuilder, TextChannel } from 'discord.js';
import { client } from '../lib/client.js';
import { logger } from '../utils/logger.js';

const DEV_LOG_CHANNEL = process.env.DEV_LOG_CHANNEL_ID;

export async function handleCommandError(
  interaction: ChatInputCommandInteraction,
  error: Error
): Promise<void> {
  logger.error(`Command error in ${interaction.commandName}:`, error);

  await sendDevLog(interaction, error);

  const errorMessage = {
    content: '❌ An error occurred while executing this command.',
    ephemeral: true,
  };

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  } catch (e) {
    logger.error('Failed to send error response:', e);
  }
}

async function sendDevLog(
  interaction: ChatInputCommandInteraction,
  error: Error
): Promise<void> {
  if (!DEV_LOG_CHANNEL) return;

  try {
    const channel = await client.channels.fetch(DEV_LOG_CHANNEL);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Command Error')
      .addFields(
        { name: 'Command', value: `\`/${interaction.commandName}\``, inline: true },
        { name: 'User', value: `${interaction.user.tag}`, inline: true },
        { name: 'Guild', value: interaction.guild?.name ?? 'DM', inline: true },
        { name: 'Error', value: `\`\`\`${error.message.slice(0, 1000)}\`\`\`` }
      )
      .setTimestamp();

    if (error.stack) {
      embed.addFields({
        name: 'Stack',
        value: `\`\`\`${error.stack.slice(0, 1000)}\`\`\``,
      });
    }

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (e) {
    logger.error('Failed to send dev log:', e);
  }
}

export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (error: Error) => {
    logger.error('Unhandled rejection:', error);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
  });
}
