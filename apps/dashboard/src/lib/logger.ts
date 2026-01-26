type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  const reqId = entry.requestId ? ` [${entry.requestId}]` : '';
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}${reqId}: ${entry.message}${ctx}`;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, requestId?: string) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(requestId && { requestId }),
  };

  const output = formatLog(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>, reqId?: string) => log('debug', msg, ctx, reqId),
  info: (msg: string, ctx?: Record<string, unknown>, reqId?: string) => log('info', msg, ctx, reqId),
  warn: (msg: string, ctx?: Record<string, unknown>, reqId?: string) => log('warn', msg, ctx, reqId),
  error: (msg: string, ctx?: Record<string, unknown>, reqId?: string) => log('error', msg, ctx, reqId),
};

// Request ID generator for tracing
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
