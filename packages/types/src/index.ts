/**
 * Shared types for Discord Bot and Dashboard
 */

// Config sync message for Redis pub/sub
export interface ConfigUpdateMessage {
  guildId: string;
  module: ConfigModule;
  action: 'update' | 'delete';
  timestamp: number;
}

export type ConfigModule =
  | 'general'
  | 'welcome'
  | 'goodbye'
  | 'moderation'
  | 'leveling'
  | 'giveaway'
  | 'tickets'
  | 'tempvoice'
  | 'autoresponder'
  | 'security'
  | 'logging';

// Dashboard settings types
export interface DashboardUser {
  id: string;
  username: string;
  role: 'admin' | 'moderator' | 'viewer';
  allowedGuilds: string[];
}

// Embed builder types
export interface EmbedData {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: string;
  image?: string;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  author?: {
    name: string;
    iconUrl?: string;
    url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: boolean;
}

// Welcome/Goodbye image config
export interface WelcomeImageConfig {
  enabled: boolean;
  backgroundUrl?: string;
  backgroundColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  accentColor?: string;
  borderRadius?: number;
  showAvatar?: boolean;
  showMemberCount?: boolean;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
