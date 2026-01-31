/**
 * Redis Pub/Sub channel names for config synchronization
 */
export const CONFIG_CHANNELS = {
  // Main config update channel
  CONFIG_UPDATE: 'bot:config:update',
  
  // Global settings channel
  SETTINGS: 'bot:config:settings',
  
  // Billing/Subscription channel
  SUBSCRIPTION: 'bot:config:subscription',
  
  // Module-specific channels
  WELCOME: 'bot:config:welcome',
  MODERATION: 'bot:config:moderation',
  LEVELING: 'bot:config:leveling',
  GIVEAWAY: 'bot:config:giveaway',
  TICKETS: 'bot:config:tickets',
  AUTORESPONDER: 'bot:config:autoresponder',
  TEMPVOICE: 'bot:config:tempvoice',
  MUSIC: 'bot:config:music',
} as const;

export type ConfigChannel = typeof CONFIG_CHANNELS[keyof typeof CONFIG_CHANNELS];

/**
 * Config update message payload
 */
export interface ConfigUpdateMessage {
  guildId: string;
  module: keyof typeof CONFIG_CHANNELS;
  action: 'update' | 'delete' | 'create';
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * Create a config update message
 */
export function createConfigMessage(
  guildId: string,
  module: keyof typeof CONFIG_CHANNELS,
  action: 'update' | 'delete' | 'create',
  data?: Record<string, unknown>
): ConfigUpdateMessage {
  return {
    guildId,
    module,
    action,
    timestamp: Date.now(),
    data,
  };
}
