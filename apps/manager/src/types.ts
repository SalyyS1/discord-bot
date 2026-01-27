/**
 * Shared types for Bot Manager service
 */

// Tenant configuration for spawning a bot
export interface TenantConfig {
  tenantId: string;
  /** Encrypted Discord token (AES-256-GCM format: iv:authTag:ciphertext) */
  discordTokenEncrypted: string;
  discordClientId: string;
  databaseUrl: string;
  redisPrefix?: string;
}

// Bot process status
export type BotStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

// Bot health information
export interface BotHealth {
  tenantId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  guilds: number;
  uptime: number;
  memory: number;
  lastPing: Date;
  error?: string;
}

// IPC message types
export interface IPCMessage {
  type: string;
  data?: unknown;
}

export interface IPCHealthRequest extends IPCMessage {
  type: 'health_request';
}

export interface IPCHealthResponse extends IPCMessage {
  type: 'health';
  data: {
    guilds: number;
    uptime: number;
    memory: number;
  };
}

export interface IPCShutdown extends IPCMessage {
  type: 'shutdown';
}

export interface IPCReady extends IPCMessage {
  type: 'ready';
  data: {
    guilds: number;
  };
}

export interface IPCError extends IPCMessage {
  type: 'error';
  data: {
    message: string;
    stack?: string;
  };
}

// Manager API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BotStatusResponse {
  tenantId: string;
  status: BotStatus;
  health?: BotHealth;
  processId?: number;
}

export interface BotListResponse {
  bots: BotStatusResponse[];
  total: number;
  running: number;
}
