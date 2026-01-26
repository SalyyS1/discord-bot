/**
 * Template Engine for parsing message templates with placeholders
 * 
 * Supported placeholders:
 * - User: {{user}}, {{username}}, {{user.tag}}, {{user.id}}, {{user.avatar}}
 * - Guild: {{server}}, {{server.name}}, {{server.icon}}, {{memberCount}}
 * - Member: {{invitedBy}}, {{level}}, {{xp}}, {{voiceMinutes}}, {{inviteCount}}
 * - Ticket: {{ticket.number}}, {{ticket.content}}, {{ticket.product}}, {{ticket.category}}
 * - Giveaway: {{prize}}, {{role}}, {{host}}, {{winners}}, {{endsAt}}, {{entries}}
 * - Rating: {{rate}}, {{rate.stars}}, {{rate.text}}
 * - Generic: {{date}}, {{time}}, {{datetime}}
 */

export interface TemplateContext {
    user?: {
        id: string;
        username: string;
        displayName?: string;
        tag?: string;
        avatar?: string;
        mention?: string;
    };
    guild?: {
        id: string;
        name: string;
        icon?: string;
        memberCount: number;
    };
    member?: {
        invitedBy?: string;
        invitedByMention?: string;
        level?: number;
        xp?: number;
        voiceMinutes?: number;
        inviteCount?: number;
        joinPosition?: number;
    };
    ticket?: {
        number: number;
        content?: string;
        product?: string;
        category?: string;
        platformUsername?: string;
    };
    giveaway?: {
        prize: string;
        role?: string;
        roleMention?: string;
        host?: string;
        hostMention?: string;
        winners?: number;
        endsAt?: Date;
        entries?: number;
    };
    rating?: {
        stars: number;
        text?: string;
    };
}

/**
 * Parse a template string and replace placeholders with context values
 */
export function parseTemplate(template: string, context: TemplateContext): string {
    let result = template;

    // User placeholders
    if (context.user) {
        result = result
            .replace(/\{\{user\}\}/g, context.user.mention || `<@${context.user.id}>`)
            .replace(/\{\{user\.mention\}\}/g, context.user.mention || `<@${context.user.id}>`)
            .replace(/\{\{username\}\}/g, context.user.username)
            .replace(/\{\{user\.username\}\}/g, context.user.username)
            .replace(/\{\{user\.displayName\}\}/g, context.user.displayName || context.user.username)
            .replace(/\{\{user\.tag\}\}/g, context.user.tag || context.user.username)
            .replace(/\{\{user\.id\}\}/g, context.user.id)
            .replace(/\{\{user\.avatar\}\}/g, context.user.avatar || '');
    }

    // Guild placeholders
    if (context.guild) {
        result = result
            .replace(/\{\{server\}\}/g, context.guild.name)
            .replace(/\{\{server\.name\}\}/g, context.guild.name)
            .replace(/\{\{server\.id\}\}/g, context.guild.id)
            .replace(/\{\{server\.icon\}\}/g, context.guild.icon || '')
            .replace(/\{\{memberCount\}\}/g, context.guild.memberCount.toString());
    }

    // Member placeholders
    if (context.member) {
        result = result
            .replace(/\{\{invitedBy\}\}/g, context.member.invitedByMention || context.member.invitedBy || 'Unknown')
            .replace(/\{\{level\}\}/g, (context.member.level ?? 0).toString())
            .replace(/\{\{xp\}\}/g, (context.member.xp ?? 0).toString())
            .replace(/\{\{voiceMinutes\}\}/g, (context.member.voiceMinutes ?? 0).toString())
            .replace(/\{\{inviteCount\}\}/g, (context.member.inviteCount ?? 0).toString())
            .replace(/\{\{joinPosition\}\}/g, (context.member.joinPosition ?? 0).toString());
    }

    // Ticket placeholders
    if (context.ticket) {
        result = result
            .replace(/\{\{ticket\.number\}\}/g, context.ticket.number.toString())
            .replace(/\{\{ticket\.content\}\}/g, context.ticket.content || '')
            .replace(/\{\{ticket\.product\}\}/g, context.ticket.product || '')
            .replace(/\{\{ticket\.category\}\}/g, context.ticket.category || '')
            .replace(/\{\{ticket\.platformUsername\}\}/g, context.ticket.platformUsername || '');
    }

    // Giveaway placeholders
    if (context.giveaway) {
        result = result
            .replace(/\{\{prize\}\}/g, context.giveaway.prize)
            .replace(/\{\{role\}\}/g, context.giveaway.roleMention || context.giveaway.role || '')
            .replace(/\{\{host\}\}/g, context.giveaway.hostMention || context.giveaway.host || '')
            .replace(/\{\{winners\}\}/g, (context.giveaway.winners ?? 1).toString())
            .replace(/\{\{entries\}\}/g, (context.giveaway.entries ?? 0).toString())
            .replace(/\{\{endsAt\}\}/g, context.giveaway.endsAt ? formatDate(context.giveaway.endsAt) : '');
    }

    // Rating placeholders
    if (context.rating) {
        result = result
            .replace(/\{\{rate\}\}/g, context.rating.stars.toString())
            .replace(/\{\{rate\.stars\}\}/g, '⭐'.repeat(context.rating.stars))
            .replace(/\{\{rate\.text\}\}/g, context.rating.text || '');
    }

    // Date/Time placeholders
    const now = new Date();
    result = result
        .replace(/\{\{date\}\}/g, formatDate(now))
        .replace(/\{\{time\}\}/g, formatTime(now))
        .replace(/\{\{datetime\}\}/g, `${formatDate(now)} ${formatTime(now)}`);

    return result;
}

/**
 * Get all available placeholders for a template type
 */
export function getPlaceholdersForType(type: string): string[] {
    const common = ['{{user}}', '{{username}}', '{{server}}', '{{memberCount}}', '{{date}}', '{{time}}'];

    const typeSpecific: Record<string, string[]> = {
        welcome: [...common, '{{invitedBy}}', '{{joinPosition}}', '{{user.avatar}}'],
        goodbye: [...common, '{{user.tag}}'],
        levelup: [...common, '{{level}}', '{{xp}}'],
        giveaway_start: [...common, '{{prize}}', '{{role}}', '{{host}}', '{{winners}}', '{{endsAt}}'],
        giveaway_end: [...common, '{{prize}}', '{{winners}}', '{{entries}}'],
        giveaway_win: [...common, '{{prize}}'],
        ticket_open: [...common, '{{ticket.number}}', '{{ticket.content}}', '{{ticket.product}}', '{{ticket.category}}'],
        ticket_close: [...common, '{{ticket.number}}'],
        ticket_rating: [...common, '{{ticket.number}}'],
        ticket_review: [...common, '{{rate}}', '{{rate.stars}}', '{{rate.text}}'],
    };

    return typeSpecific[type] || common;
}

/**
 * Validate a template string for syntax errors
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed placeholders
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
        errors.push('Mismatched placeholder braces');
    }

    // Check for unknown placeholders
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let match;
    const knownPlaceholders = [
        'user', 'username', 'user.mention', 'user.username', 'user.displayName', 'user.tag', 'user.id', 'user.avatar',
        'server', 'server.name', 'server.id', 'server.icon', 'memberCount',
        'invitedBy', 'level', 'xp', 'voiceMinutes', 'inviteCount', 'joinPosition',
        'ticket.number', 'ticket.content', 'ticket.product', 'ticket.category', 'ticket.platformUsername',
        'prize', 'role', 'host', 'winners', 'entries', 'endsAt',
        'rate', 'rate.stars', 'rate.text',
        'date', 'time', 'datetime'
    ];

    while ((match = placeholderRegex.exec(template)) !== null) {
        if (!knownPlaceholders.includes(match[1])) {
            errors.push(`Unknown placeholder: {{${match[1]}}}`);
        }
    }

    return { valid: errors.length === 0, errors };
}

// Helper functions
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

export default {
    parseTemplate,
    getPlaceholdersForType,
    validateTemplate,
};
