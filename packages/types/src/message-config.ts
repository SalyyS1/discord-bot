/**
 * Message Builder Configuration Types
 * Canonical format for Discord message customization
 */

// ═══════════════════════════════════════════════
// Discord API Limits - Enforced in UI and Compiler
// ═══════════════════════════════════════════════

export const MESSAGE_LIMITS = {
  CONTENT_LENGTH: 2000,
  EMBEDS_PER_MESSAGE: 10,
  EMBED_TITLE_LENGTH: 256,
  EMBED_DESCRIPTION_LENGTH: 4096,
  EMBED_FIELDS_COUNT: 25,
  EMBED_FIELD_NAME_LENGTH: 256,
  EMBED_FIELD_VALUE_LENGTH: 1024,
  EMBED_FOOTER_LENGTH: 2048,
  EMBED_AUTHOR_NAME_LENGTH: 256,
  COMPONENT_ROWS: 5,
  BUTTONS_PER_ROW: 5,
  SELECT_OPTIONS: 25,
  BUTTON_LABEL_LENGTH: 80,
  SELECT_PLACEHOLDER_LENGTH: 150,
} as const;

// ═══════════════════════════════════════════════
// Core Message Configuration
// ═══════════════════════════════════════════════

export interface MessageConfig {
  version: 2;
  content?: string;
  embeds: EmbedConfig[];
  components: ComponentRow[];
}

// ═══════════════════════════════════════════════
// Embed Configuration
// ═══════════════════════════════════════════════

export interface EmbedConfig {
  author?: {
    name: string;
    iconUrl?: string;  // Validated: http/https only
    url?: string;      // Validated: http/https only
  };
  title?: string;
  titleUrl?: string;
  description?: string;
  color?: number;      // 0-16777215
  fields: EmbedField[];
  thumbnail?: string;  // Validated URL
  image?: string;      // Validated URL
  footer?: {
    text: string;
    iconUrl?: string;
  };
  timestamp?: boolean;
}

export interface EmbedField {
  name: string;        // max 256 chars
  value: string;       // max 1024 chars
  inline?: boolean;
}

// ═══════════════════════════════════════════════
// Component Configuration
// ═══════════════════════════════════════════════

export interface ComponentRow {
  type: 'buttons' | 'select';
  buttons?: ButtonConfig[];  // max 5
  select?: SelectConfig;
}

export type ButtonStyle = 'primary' | 'secondary' | 'success' | 'danger' | 'link';

export interface ButtonConfig {
  id: string;          // Internal reference
  label: string;       // max 80 chars
  style: ButtonStyle;
  customId?: string;   // For non-link buttons
  url?: string;        // For link buttons only
  emoji?: string;
  disabled?: boolean;
}

export interface SelectConfig {
  customId: string;
  placeholder?: string;  // max 150 chars
  minValues?: number;
  maxValues?: number;
  options: SelectOption[];  // max 25
}

export interface SelectOption {
  label: string;       // max 100 chars
  value: string;       // max 100 chars
  description?: string; // max 100 chars
  emoji?: string;
  default?: boolean;
}

// ═══════════════════════════════════════════════
// Template Context (Variables)
// ═══════════════════════════════════════════════

export interface TemplateContext {
  // User variables
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    mention: string;
    createdAt: Date;
  };
  // Member variables
  member?: {
    nickname?: string;
    joinedAt?: Date;
    roles: string[];
  };
  // Guild variables
  guild?: {
    id: string;
    name: string;
    iconUrl?: string;
    memberCount: number;
    createdAt: Date;
  };
  // Channel variables
  channel?: {
    id: string;
    name: string;
    mention: string;
  };
  // Custom variables
  custom?: Record<string, string | number | boolean>;
  // Timestamp
  timestamp?: Date;
}

// ═══════════════════════════════════════════════
// Template Status
// ═══════════════════════════════════════════════

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// ═══════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════

export function createEmptyMessageConfig(): MessageConfig {
  return {
    version: 2,
    content: '',
    embeds: [],
    components: [],
  };
}

export function createEmptyEmbed(): EmbedConfig {
  return {
    fields: [],
  };
}

export function createDefaultWelcomeConfig(): MessageConfig {
  return {
    version: 2,
    content: 'Welcome to {{guild.name}}, {{user.mention}}!',
    embeds: [{
      title: 'Welcome!',
      description: 'Thanks for joining **{{guild.name}}**! You are member #{{guild.memberCount}}.',
      color: 0x5865F2,
      fields: [],
      timestamp: true,
    }],
    components: [],
  };
}

export function createDefaultGoodbyeConfig(): MessageConfig {
  return {
    version: 2,
    content: '',
    embeds: [{
      title: 'Goodbye!',
      description: '**{{user.username}}** has left the server.',
      color: 0xED4245,
      fields: [],
      timestamp: true,
    }],
    components: [],
  };
}
