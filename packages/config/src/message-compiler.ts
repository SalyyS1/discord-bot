/**
 * Message Compiler
 * Transforms MessageConfig → Discord API-compatible payloads
 */

import type {
  MessageConfig,
  EmbedConfig,
  ComponentRow,
  ButtonConfig,
  SelectConfig,
  TemplateContext,
  ButtonStyle,
  MESSAGE_LIMITS,
} from '@repo/types';

// ═══════════════════════════════════════════════
// Compiled Output Types (Discord API compatible)
// ═══════════════════════════════════════════════

export interface CompiledEmbed {
  author?: {
    name: string;
    icon_url?: string;
    url?: string;
  };
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface CompiledButton {
  type: 2; // Button component type
  style: number;
  label?: string;
  emoji?: { name: string } | { id: string };
  custom_id?: string;
  url?: string;
  disabled?: boolean;
}

export interface CompiledSelectMenu {
  type: 3; // StringSelect component type
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  options: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: { name: string } | { id: string };
    default?: boolean;
  }>;
}

export interface CompiledActionRow {
  type: 1; // ActionRow component type
  components: (CompiledButton | CompiledSelectMenu)[];
}

export interface CompiledMessage {
  content?: string;
  embeds: CompiledEmbed[];
  components: CompiledActionRow[];
}

// ═══════════════════════════════════════════════
// Template Parser
// ═══════════════════════════════════════════════

const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Parse template string and replace variables with context values
 */
export function parseTemplate(template: string, context: TemplateContext): string {
  return template.replace(VARIABLE_REGEX, (match, path: string) => {
    const value = getNestedValue(context as unknown as Record<string, unknown>, path.trim());
    if (value === undefined || value === null) {
      return match; // Keep original if not found
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// ═══════════════════════════════════════════════
// URL Validation (Security Critical)
// ═══════════════════════════════════════════════

/**
 * Validate URL for safety - only allow http/https, no internal IPs
 */
export function validateUrl(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return undefined;
    }

    // Block localhost and internal IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    ) {
      return undefined;
    }

    return url;
  } catch {
    return undefined;
  }
}

// ═══════════════════════════════════════════════
// Button Style Mapping
// ═══════════════════════════════════════════════

const BUTTON_STYLE_MAP: Record<ButtonStyle, number> = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
  link: 5,
};

// ═══════════════════════════════════════════════
// Main Compiler Function
// ═══════════════════════════════════════════════

/**
 * Compile MessageConfig to Discord API-compatible payload
 */
export function compileMessage(
  config: MessageConfig,
  context: TemplateContext
): CompiledMessage {
  // Process content with variables
  const content = config.content
    ? parseTemplate(config.content, context).slice(0, 2000)
    : undefined;

  // Compile embeds (max 10)
  const embeds = config.embeds
    .slice(0, 10)
    .map((embedConfig) => compileEmbed(embedConfig, context));

  // Compile components (max 5 rows)
  const components = config.components
    .slice(0, 5)
    .map((row) => compileComponentRow(row, context))
    .filter((row): row is CompiledActionRow => row !== null);

  return { content, embeds, components };
}

/**
 * Compile a single embed
 */
export function compileEmbed(
  config: EmbedConfig,
  context: TemplateContext
): CompiledEmbed {
  const embed: CompiledEmbed = {};

  if (config.author) {
    embed.author = {
      name: parseTemplate(config.author.name, context).slice(0, 256),
      icon_url: validateUrl(config.author.iconUrl),
      url: validateUrl(config.author.url),
    };
  }

  if (config.title) {
    embed.title = parseTemplate(config.title, context).slice(0, 256);
    if (config.titleUrl) {
      embed.url = validateUrl(config.titleUrl);
    }
  }

  if (config.description) {
    embed.description = parseTemplate(config.description, context).slice(0, 4096);
  }

  if (config.color !== undefined) {
    embed.color = Math.min(Math.max(config.color, 0), 16777215);
  }

  // Fields (max 25)
  if (config.fields && config.fields.length > 0) {
    embed.fields = config.fields.slice(0, 25).map((field) => ({
      name: parseTemplate(field.name, context).slice(0, 256) || '\u200b',
      value: parseTemplate(field.value, context).slice(0, 1024) || '\u200b',
      inline: field.inline,
    }));
  }

  if (config.thumbnail) {
    const url = validateUrl(config.thumbnail);
    if (url) embed.thumbnail = { url };
  }

  if (config.image) {
    const url = validateUrl(config.image);
    if (url) embed.image = { url };
  }

  if (config.footer) {
    embed.footer = {
      text: parseTemplate(config.footer.text, context).slice(0, 2048),
      icon_url: validateUrl(config.footer.iconUrl),
    };
  }

  if (config.timestamp) {
    embed.timestamp = (context.timestamp || new Date()).toISOString();
  }

  return embed;
}

/**
 * Compile a component row
 */
function compileComponentRow(
  row: ComponentRow,
  context: TemplateContext
): CompiledActionRow | null {
  if (row.type === 'buttons' && row.buttons && row.buttons.length > 0) {
    return {
      type: 1,
      components: row.buttons
        .slice(0, 5)
        .map((btn) => compileButton(btn, context)),
    };
  }

  if (row.type === 'select' && row.select) {
    return {
      type: 1,
      components: [compileSelectMenu(row.select, context)],
    };
  }

  return null;
}

/**
 * Compile a button
 */
function compileButton(
  config: ButtonConfig,
  context: TemplateContext
): CompiledButton {
  const button: CompiledButton = {
    type: 2,
    style: BUTTON_STYLE_MAP[config.style] || 2,
    label: parseTemplate(config.label, context).slice(0, 80) || undefined,
    disabled: config.disabled,
  };

  if (config.style === 'link' && config.url) {
    button.url = validateUrl(config.url);
  } else if (config.customId) {
    button.custom_id = config.customId;
  }

  if (config.emoji) {
    // Check if it's a custom emoji ID or unicode
    if (/^\d+$/.test(config.emoji)) {
      button.emoji = { id: config.emoji };
    } else {
      button.emoji = { name: config.emoji };
    }
  }

  return button;
}

/**
 * Compile a select menu
 */
function compileSelectMenu(
  config: SelectConfig,
  context: TemplateContext
): CompiledSelectMenu {
  return {
    type: 3,
    custom_id: config.customId,
    placeholder: config.placeholder?.slice(0, 150),
    min_values: config.minValues,
    max_values: config.maxValues,
    options: config.options.slice(0, 25).map((opt) => ({
      label: parseTemplate(opt.label, context).slice(0, 100),
      value: opt.value.slice(0, 100),
      description: opt.description?.slice(0, 100),
      emoji: opt.emoji
        ? /^\d+$/.test(opt.emoji)
          ? { id: opt.emoji }
          : { name: opt.emoji }
        : undefined,
      default: opt.default,
    })),
  };
}

// ═══════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validate MessageConfig against Discord limits
 */
export function validateMessageConfig(config: MessageConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (config.content && config.content.length > 2000) {
    errors.push({ path: 'content', message: 'Content exceeds 2000 characters' });
  }

  if (config.embeds.length > 10) {
    errors.push({ path: 'embeds', message: 'Maximum 10 embeds allowed' });
  }

  config.embeds.forEach((embed, i) => {
    if (embed.title && embed.title.length > 256) {
      errors.push({ path: `embeds[${i}].title`, message: 'Title exceeds 256 characters' });
    }
    if (embed.description && embed.description.length > 4096) {
      errors.push({ path: `embeds[${i}].description`, message: 'Description exceeds 4096 characters' });
    }
    if (embed.fields && embed.fields.length > 25) {
      errors.push({ path: `embeds[${i}].fields`, message: 'Maximum 25 fields allowed' });
    }
  });

  if (config.components.length > 5) {
    errors.push({ path: 'components', message: 'Maximum 5 component rows allowed' });
  }

  config.components.forEach((row, i) => {
    if (row.type === 'buttons' && row.buttons && row.buttons.length > 5) {
      errors.push({ path: `components[${i}].buttons`, message: 'Maximum 5 buttons per row' });
    }
    if (row.type === 'select' && row.select && row.select.options.length > 25) {
      errors.push({ path: `components[${i}].select.options`, message: 'Maximum 25 select options' });
    }
  });

  return errors;
}
