import { ClientEvents } from 'discord.js';

export interface EventOptions<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void> | void;
}

export class Event<K extends keyof ClientEvents> implements EventOptions<K> {
  name: K;
  once: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void> | void;

  constructor(options: EventOptions<K>) {
    this.name = options.name;
    this.once = options.once ?? false;
    this.execute = options.execute;
  }
}
