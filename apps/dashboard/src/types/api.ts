// Shared API types for dashboard hooks

export interface Guild {
  id: string;
  name: string;
  icon?: string | null;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category' | 'announcement' | 'forum' | 'stage';
  parentId?: string | null;
  parentName?: string;
}

export interface GuildSettings {
  guildId: string;
  // Welcome settings
  welcomeEnabled?: boolean;
  welcomeChannelId?: string | null;
  welcomeMessage?: string | null;
  welcomeImageEnabled?: boolean;
  welcomeImageUrl?: string | null;
  // Goodbye settings
  goodbyeEnabled?: boolean;
  goodbyeChannelId?: string | null;
  goodbyeMessage?: string | null;
  goodbyeImageEnabled?: boolean;
  goodbyeImageUrl?: string | null;
  // Leveling settings
  levelingEnabled?: boolean;
  xpMin?: number;
  xpMax?: number;
  xpCooldownSeconds?: number;
  levelUpChannelId?: string | null;
  levelUpMessage?: string | null;
  levelUpDmEnabled?: boolean;
  voiceXpEnabled?: boolean;
  voiceXpPerMinute?: number;
  // Moderation settings
  antiSpamEnabled?: boolean;
  antiLinkEnabled?: boolean;
  wordFilterEnabled?: boolean;
  mentionSpamEnabled?: boolean;
  moderationLogChannelId?: string | null;
  // Ticket settings
  ticketsEnabled?: boolean;
  ticketCategoryId?: string | null;
  ticketLogChannelId?: string | null;
  ticketMaxPerUser?: number;
  ticketCooldownMinutes?: number;
  // Other settings
  prefix?: string;
  timezone?: string;
  language?: string;
}

export interface AutoResponder {
  id: string;
  guildId: string;
  trigger: string;
  triggerType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  response: string;
  responseType: 'TEXT' | 'EMBED' | 'REACTION';
  cooldownSeconds: number;
  enabled: boolean;
}

export interface Giveaway {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string | null;
  prize: string;
  winnersCount: number;
  endsAt: string;
  hostId: string;
  ended: boolean;
}
