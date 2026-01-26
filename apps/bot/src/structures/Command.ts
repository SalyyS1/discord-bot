import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionResolvable,
} from 'discord.js';

export interface CommandOptions {
  data:
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  category?: string;
  cooldown?: number;
  permissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  devOnly?: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export class Command {
  data: CommandOptions['data'];
  category: string;
  cooldown: number;
  permissions: PermissionResolvable[];
  botPermissions: PermissionResolvable[];
  devOnly: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;

  constructor(options: CommandOptions) {
    this.data = options.data;
    this.category = options.category ?? 'misc';
    this.cooldown = options.cooldown ?? 3;
    this.permissions = options.permissions ?? [];
    this.botPermissions = options.botPermissions ?? [];
    this.devOnly = options.devOnly ?? false;
    this.execute = options.execute;
    this.autocomplete = options.autocomplete;
  }
}
