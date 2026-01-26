/**
 * Logger utility for Bot Manager Service
 * 
 * Production: JSON structured logs for log aggregation
 * Development: Human-readable colored logs
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    message: string;
    context?: Record<string, unknown>;
    tenantId?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';
const SERVICE_NAME = 'manager';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatLog(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
        return JSON.stringify(entry);
    }

    const tenant = entry.tenantId ? ` [${entry.tenantId}]` : '';
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}]${tenant} ${entry.message}${ctx}`;
}

function log(
    level: LogLevel,
    message: string,
    options?: { tenantId?: string; context?: Record<string, unknown> }
): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        service: SERVICE_NAME,
        message,
        ...(options?.context && { context: options.context }),
        ...(options?.tenantId && { tenantId: options.tenantId }),
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
    debug: (msg: string, opts?: { tenantId?: string; context?: Record<string, unknown> }) =>
        log('debug', msg, opts),
    info: (msg: string, opts?: { tenantId?: string; context?: Record<string, unknown> }) =>
        log('info', msg, opts),
    warn: (msg: string, opts?: { tenantId?: string; context?: Record<string, unknown> }) =>
        log('warn', msg, opts),
    error: (msg: string, opts?: { tenantId?: string; context?: Record<string, unknown> }) =>
        log('error', msg, opts),
};
