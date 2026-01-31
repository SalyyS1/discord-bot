/**
 * Real-time Sync Event Types
 * Shared between Discord Bot and Dashboard
 */

export type EventType =
  // Member events
  | 'MEMBER_JOIN'
  | 'MEMBER_LEAVE'
  | 'MEMBER_UPDATE'
  // Ticket events
  | 'TICKET_CREATE'
  | 'TICKET_CLAIM'
  | 'TICKET_CLOSE'
  | 'TICKET_MESSAGE'
  // Giveaway events
  | 'GIVEAWAY_START'
  | 'GIVEAWAY_ENTRY'
  | 'GIVEAWAY_END'
  // Settings events
  | 'SETTINGS_UPDATE'
  // Leveling events
  | 'XP_GAIN'
  | 'LEVEL_UP'
  // Moderation events
  | 'MOD_ACTION'
  | 'MESSAGE_DELETE'
  // Voice events
  | 'VOICE_JOIN'
  | 'VOICE_LEAVE';

/**
 * Base sync event structure
 */
export interface SyncEvent {
  id: string; // UUID
  type: EventType;
  guildId: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Member join event
 */
export interface MemberJoinEvent extends SyncEvent {
  type: 'MEMBER_JOIN';
  data: {
    userId: string;
    username: string;
    avatar?: string;
    joinedAt: string;
  };
}

/**
 * Member leave event
 */
export interface MemberLeaveEvent extends SyncEvent {
  type: 'MEMBER_LEAVE';
  data: {
    userId: string;
    username: string;
  };
}

/**
 * Ticket create event
 */
export interface TicketCreateEvent extends SyncEvent {
  type: 'TICKET_CREATE';
  data: {
    ticketId: string;
    channelId: string;
    userId: string;
    username: string;
    category?: string;
    createdAt: string;
  };
}

/**
 * Ticket claim event
 */
export interface TicketClaimEvent extends SyncEvent {
  type: 'TICKET_CLAIM';
  data: {
    ticketId: string;
    channelId: string;
    claimedBy: string;
    claimerName: string;
  };
}

/**
 * Ticket close event
 */
export interface TicketCloseEvent extends SyncEvent {
  type: 'TICKET_CLOSE';
  data: {
    ticketId: string;
    channelId: string;
    closedBy: string;
    reason?: string;
  };
}

/**
 * XP gain event
 */
export interface XpGainEvent extends SyncEvent {
  type: 'XP_GAIN';
  data: {
    userId: string;
    username: string;
    xpGained: number;
    totalXp: number;
  };
}

/**
 * Level up event
 */
export interface LevelUpEvent extends SyncEvent {
  type: 'LEVEL_UP';
  data: {
    userId: string;
    username: string;
    level: number;
    totalXp: number;
  };
}

/**
 * Moderation action event
 */
export interface ModActionEvent extends SyncEvent {
  type: 'MOD_ACTION';
  data: {
    action: 'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'UNBAN';
    targetId: string;
    targetName: string;
    moderatorId: string;
    moderatorName: string;
    reason?: string;
    duration?: number;
  };
}

/**
 * Giveaway start event
 */
export interface GiveawayStartEvent extends SyncEvent {
  type: 'GIVEAWAY_START';
  data: {
    giveawayId: string;
    prize: string;
    endTime: string;
    winners: number;
    hostId: string;
  };
}

/**
 * Giveaway end event
 */
export interface GiveawayEndEvent extends SyncEvent {
  type: 'GIVEAWAY_END';
  data: {
    giveawayId: string;
    prize: string;
    winnerIds: string[];
  };
}

/**
 * Settings update event
 */
export interface SettingsUpdateEvent extends SyncEvent {
  type: 'SETTINGS_UPDATE';
  data: {
    module: string;
    settings: Record<string, unknown>;
  };
}

/**
 * Union type of all sync events
 */
export type AnySyncEvent =
  | MemberJoinEvent
  | MemberLeaveEvent
  | TicketCreateEvent
  | TicketClaimEvent
  | TicketCloseEvent
  | XpGainEvent
  | LevelUpEvent
  | ModActionEvent
  | GiveawayStartEvent
  | GiveawayEndEvent
  | SettingsUpdateEvent
  | SyncEvent;

/**
 * Redis channel names
 */
export const SYNC_CHANNELS = {
  BOT_EVENTS: 'discord_events', // Bot → Dashboard
  BOT_COMMANDS: 'bot_commands', // Dashboard → Bot
} as const;

/**
 * WebSocket message types
 */
export interface WsAuthMessage {
  type: 'auth';
  token: string;
  guildId?: string;
}

export interface WsSubscribeMessage {
  type: 'subscribe';
  guildId: string;
}

export interface WsUnsubscribeMessage {
  type: 'unsubscribe';
  guildId: string;
}

export interface WsEventMessage {
  type: 'event';
  event: AnySyncEvent;
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
}

export interface WsPingMessage {
  type: 'ping';
}

export interface WsPongMessage {
  type: 'pong';
}

export interface WsConnectedMessage {
  type: 'connected';
}

export interface WsAuthenticatedMessage {
  type: 'authenticated';
  userId: string;
}

export interface WsSubscribedMessage {
  type: 'subscribed';
  guildId: string;
}

export interface WsUnsubscribedMessage {
  type: 'unsubscribed';
  guildId: string;
}

export type WsMessage =
  | WsAuthMessage
  | WsSubscribeMessage
  | WsUnsubscribeMessage
  | WsEventMessage
  | WsErrorMessage
  | WsPingMessage
  | WsPongMessage
  | WsConnectedMessage
  | WsAuthenticatedMessage
  | WsSubscribedMessage
  | WsUnsubscribedMessage;
