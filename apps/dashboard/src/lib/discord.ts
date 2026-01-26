const DISCORD_API_URL = 'https://discord.com/api/v10';
const BOT_TOKEN = process.env.DISCORD_TOKEN;

/**
 * Fetch data from Discord API using Bot Token
 */
async function fetchDiscord(endpoint: string, options: RequestInit = {}) {
    if (!BOT_TOKEN) {
        throw new Error('DISCORD_TOKEN is not set');
    }

    const res = await fetch(`${DISCORD_API_URL}${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        throw new Error(`Discord API Error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

export interface DiscordChannel {
    id: string;
    name: string;
    type: number; // 0 = GUILD_TEXT, 2 = GUILD_VOICE, 4 = GUILD_CATEGORY, 5 = GUILD_ANNOUNCEMENT, 13 = GUILD_STAGE_VOICE, 15 = GUILD_FORUM
    parent_id?: string | null;
    position?: number;
}

export interface DiscordRole {
    id: string;
    name: string;
    color: number;
    position: number;
}

export const discordService = {
    getGuildChannels: async (guildId: string): Promise<DiscordChannel[]> => {
        return fetchDiscord(`/guilds/${guildId}/channels`);
    },
    getGuildRoles: async (guildId: string): Promise<DiscordRole[]> => {
        return fetchDiscord(`/guilds/${guildId}/roles`);
    },
};
