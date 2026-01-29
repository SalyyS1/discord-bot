/**
 * Manager API Client with HMAC Authentication
 *
 * Provides authenticated access to Bot Manager API endpoints.
 * Uses HMAC-SHA256 signatures for request authentication.
 */

import * as crypto from 'crypto';

const MANAGER_URL = process.env.MANAGER_API_URL || 'http://localhost:3001';
const API_KEY = process.env.MANAGER_API_KEY;

/**
 * Generate authentication headers for Manager API request
 */
function generateAuthHeaders(method: string, path: string): HeadersInit {
  if (!API_KEY) {
    throw new Error('MANAGER_API_KEY not configured');
  }

  const timestamp = Date.now().toString();
  const payload = `${method}:${path}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', API_KEY)
    .update(payload)
    .digest('hex');

  return {
    'x-api-key': API_KEY,
    'x-timestamp': timestamp,
    'x-signature': signature,
    'Content-Type': 'application/json',
  };
}

/**
 * Make authenticated request to Manager API
 */
export async function managerRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${MANAGER_URL}${path}`, {
    method,
    headers: generateAuthHeaders(method, path),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Manager API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Convenience functions for common Manager API operations
 */
export const managerApi = {
  listBots: () =>
    managerRequest<{ success: boolean; data: { bots: unknown[]; total: number; running: number } }>(
      'GET',
      '/bots'
    ),

  getBotStatus: (tenantId: string) =>
    managerRequest<{ success: boolean; data: unknown }>('GET', `/bots/${tenantId}/status`),

  startBot: (tenantId: string) =>
    managerRequest<{ success: boolean; data: { tenantId: string; status: string } }>(
      'POST',
      `/bots/${tenantId}/start`
    ),

  stopBot: (tenantId: string) =>
    managerRequest<{ success: boolean; data: { tenantId: string; status: string } }>(
      'POST',
      `/bots/${tenantId}/stop`
    ),

  restartBot: (tenantId: string) =>
    managerRequest<{ success: boolean; data: { tenantId: string; status: string } }>(
      'POST',
      `/bots/${tenantId}/restart`
    ),
};
