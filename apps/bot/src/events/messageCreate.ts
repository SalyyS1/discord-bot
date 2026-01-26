import { Events, Message } from 'discord.js';
import { Event } from '../structures/Event.js';
import { AntiLinkModule } from '../modules/security/antiLink.js';
import { AntiSpamModule } from '../modules/security/antiSpam.js';
import { WordFilterModule } from '../modules/security/wordFilter.js';
import { MentionSpamModule } from '../modules/security/mentionSpam.js';
import { LevelingModule } from '../modules/leveling/index.js';
import { StickyMessageModule } from '../modules/utility/stickyMessage.js';
import { AutoResponderModule } from '../modules/autoresponder/index.js';
import { logger } from '../utils/logger.js';

/**
 * Message create event handler
 * Handles security checks, auto-responder, XP gain, and sticky messages
 */
export default new Event({
  name: Events.MessageCreate,
  async execute(message: Message) {
    try {
      // Ignore bots and DMs
      if (message.author.bot || !message.guild) return;

      // Security checks first (with individual error handling, order matters)
      try {
        const isFiltered = await WordFilterModule.check(message);
        if (isFiltered) return;
      } catch (error) {
        logger.error('WordFilter check failed:', error);
      }

      try {
        const isMentionSpam = await MentionSpamModule.check(message);
        if (isMentionSpam) return;
      } catch (error) {
        logger.error('MentionSpam check failed:', error);
      }

      try {
        const isSpam = await AntiSpamModule.check(message);
        if (isSpam) return;
      } catch (error) {
        logger.error('AntiSpam check failed:', error);
      }

      try {
        const isLink = await AntiLinkModule.check(message);
        if (isLink) return;
      } catch (error) {
        logger.error('AntiLink check failed:', error);
      }

      // Check auto-responder triggers
      try {
        const responded = await AutoResponderModule.check(message);
        if (responded) return;
      } catch (error) {
        logger.error('AutoResponder check failed:', error);
      }

      // Process XP gain (runs in background)
      LevelingModule.processMessage(message).catch((error) => {
        logger.error('Leveling processMessage failed:', error);
      });

      // Re-stick sticky messages (runs in background)
      StickyMessageModule.restick(message).catch((error) => {
        logger.error('StickyMessage restick failed:', error);
      });
    } catch (error) {
      logger.error('messageCreate handler error:', error);
    }
  },
});
