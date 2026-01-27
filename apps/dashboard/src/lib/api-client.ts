'use client';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface FetchResult<T> {
  data: T | null;
  error: ApiResponse<never> | null;
}

/**
 * Fetch wrapper with error handling
 * Returns structured result with data or error
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<FetchResult<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      return {
        data: null,
        error: {
          success: false,
          error: json.error || 'Request failed',
          code: json.code,
        },
      };
    }

    return { data: json.data || null, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * POST helper
 */
export function apiPost<T>(url: string, body: unknown): Promise<FetchResult<T>> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PATCH helper
 */
export function apiPatch<T>(url: string, body: unknown): Promise<FetchResult<T>> {
  return apiFetch<T>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE helper
 */
export function apiDelete<T>(url: string): Promise<FetchResult<T>> {
  return apiFetch<T>(url, {
    method: 'DELETE',
  });
}
