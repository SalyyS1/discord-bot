/**
 * CORS Configuration for Manager API
 * Restricts Manager API to known callers only
 */

import cors from 'cors';

/**
 * Get allowed origins for CORS
 * Restricts Manager API to known callers only
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Dashboard URL (required)
  const dashboardUrl = process.env.DASHBOARD_URL;
  if (dashboardUrl) {
    origins.push(dashboardUrl);
  }

  // Additional allowed origins (comma-separated)
  const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (additionalOrigins) {
    origins.push(...additionalOrigins.split(',').map(o => o.trim()));
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * CORS options for Manager API
 */
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();

    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'x-timestamp', 'x-signature'],
  maxAge: 86400, // 24 hours
};
