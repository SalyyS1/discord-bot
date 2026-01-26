/**
 * Duration parsing and formatting utilities
 */

const UNITS: Record<string, number> = {
  s: 1000,
  sec: 1000,
  second: 1000,
  seconds: 1000,
  m: 60 * 1000,
  min: 60 * 1000,
  minute: 60 * 1000,
  minutes: 60 * 1000,
  h: 60 * 60 * 1000,
  hr: 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Parse duration string to milliseconds
 * @param input - Duration string like "30s", "5m", "2h", "7d"
 * @returns Milliseconds or null if invalid
 */
export function parseDuration(input: string): number | null {
  const match = input.toLowerCase().trim().match(/^(\d+)\s*([a-z]+)$/);
  if (!match) return null;

  const [, amount, unit] = match;
  const multiplier = UNITS[unit];
  if (!multiplier) return null;

  const value = parseInt(amount, 10);
  if (isNaN(value) || value <= 0) return null;

  return value * multiplier;
}

/**
 * Format milliseconds to human-readable duration
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "2h 30m" or "5d 2h"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Format milliseconds to short format for display
 * @param ms - Duration in milliseconds
 * @returns Short format like "5m" or "2h"
 */
export function formatDurationShort(ms: number): string {
  if (ms < 60 * 1000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))}m`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))}h`;
  return `${Math.floor(ms / (24 * 60 * 60 * 1000))}d`;
}
