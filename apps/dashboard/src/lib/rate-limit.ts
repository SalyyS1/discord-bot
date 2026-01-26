import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter using LRU-like sliding window
 * For production, consider Redis-based solution
 */
const rateLimitMap = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes

// Periodic cleanup of old entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < WINDOW_MS);
      if (validTimestamps.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, validTimestamps);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param limit - Max requests per window (default: 60)
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  limit: number = MAX_REQUESTS
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];

  // Filter to only timestamps within the window
  const validTimestamps = timestamps.filter(t => now - t < WINDOW_MS);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetIn = WINDOW_MS - (now - oldestTimestamp);
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil(resetIn / 1000),
    };
  }

  // Add current request timestamp
  validTimestamps.push(now);
  rateLimitMap.set(identifier, validTimestamps);

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetIn: Math.ceil(WINDOW_MS / 1000),
  };
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return ip;
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: resetIn,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(resetIn),
        'X-RateLimit-Limit': String(MAX_REQUESTS),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}
