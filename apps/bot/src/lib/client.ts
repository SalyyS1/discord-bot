import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { Command } from '../structures/Command.js';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  allowedMentions: { parse: ['users', 'roles'] },
});

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}

client.commands = new Collection();
client.cooldowns = new Collection();
