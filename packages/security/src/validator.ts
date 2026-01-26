/**
 * Discord Token Validation Service
 * Validates bot tokens by attempting a minimal connection
 */

export interface TokenValidationResult {
  valid: boolean;
  botId?: string;
  botUsername?: string;
  botAvatar?: string;
  error?: string;
}

/**
 * Validate a Discord bot token by making an API request
 * This is a lightweight validation that doesn't require full login
 */
export async function validateDiscordToken(
  token: string
): Promise<TokenValidationResult> {
  if (!token || token.length < 50) {
    return {
      valid: false,
      error: 'Token is too short or invalid format',
    };
  }

  try {
    // Use Discord's /users/@me endpoint to validate token
    // This is faster and lighter than full client login
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        valid: false,
        error: errorData.message || `Invalid token (HTTP ${response.status})`,
      };
    }

    const user = await response.json();
    
    // Verify it's a bot account
    if (!user.bot) {
      return {
        valid: false,
        error: 'Token is not a bot token',
      };
    }

    return {
      valid: true,
      botId: user.id,
      botUsername: user.username,
      botAvatar: user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : undefined,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Failed to validate token',
    };
  }
}

/**
 * Validate a Discord Client ID (Snowflake format)
 */
export function validateClientId(clientId: string): boolean {
  // Discord snowflakes are 17-19 digit numbers
  return /^\d{17,19}$/.test(clientId);
}

/**
 * Validate bot token format (without making API call)
 * Discord tokens typically have format: base64.timestamp.hmac
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  // Modern Discord bot tokens have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // First part should be base64-encoded bot ID
  try {
    const decoded = Buffer.from(parts[0], 'base64').toString('utf8');
    // Bot ID should be a snowflake
    if (!/^\d{17,19}$/.test(decoded)) return false;
  } catch {
    return false;
  }
  
  // Token should be at least 50 characters
  return token.length >= 50;
}

/**
 * Extract bot ID from token without API call
 */
export function extractBotIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const decoded = Buffer.from(parts[0], 'base64').toString('utf8');
    if (/^\d{17,19}$/.test(decoded)) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}
