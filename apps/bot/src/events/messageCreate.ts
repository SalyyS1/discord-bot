import { Events, Message } from 'discord.js';
import { Event } from '../structures/Event.js';
import { AntiLinkModule } from '../modules/security/antiLink.js';
import { AntiSpamModule } from '../modules/security/antiSpam.js';
import { LevelingModule } from '../modules/leveling/index.js';
import { StickyMessageModule } from '../modules/utility/stickyMessage.js';
import { AutoResponderModule } from '../modules/autoresponder/index.js';

/**
 * Message create event handler
 * Handles security checks, auto-responder, XP gain, and sticky messages
 */
export default new Event({
  name: Events.MessageCreate,
  async execute(message: Message) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // Security checks first
    const isSpam = await AntiSpamModule.check(message);
    if (isSpam) return;

    const isLink = await AntiLinkModule.check(message);
    if (isLink) return;

    // Check auto-responder triggers
    const responded = await AutoResponderModule.check(message);
    if (responded) return;

    // Process XP gain (runs in background)
    LevelingModule.processMessage(message).catch(() => {});

    // Re-stick sticky messages (runs in background)
    StickyMessageModule.restick(message).catch(() => {});
  },
});
