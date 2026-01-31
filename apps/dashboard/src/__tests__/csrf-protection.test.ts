/**
 * CSRF Protection Test
 * Verify CSRF tokens are required for mutating requests
 */

describe('CSRF Protection', () => {
  const CSRF_COOKIE_NAME = '__Host-csrf';
  const CSRF_HEADER_NAME = 'x-csrf-token';

  test('POST request without CSRF token should be rejected', async () => {
    const response = await fetch('/api/guilds/test/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('CSRF');
  });

  test('POST request with valid CSRF token should succeed', async () => {
    // First get CSRF token
    const csrfResponse = await fetch('/api/csrf');
    expect(csrfResponse.ok).toBe(true);

    // Extract token from cookie
    const cookies = csrfResponse.headers.get('set-cookie');
    const tokenMatch = cookies?.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
    const token = tokenMatch?.[1];

    expect(token).toBeDefined();

    // Now make authenticated request
    const response = await fetch('/api/guilds/test/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER_NAME]: token!,
        Cookie: `${CSRF_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({ test: 'data' }),
    });

    // Should not be rejected for CSRF (may fail for other reasons like auth)
    expect(response.status).not.toBe(403);
  });

  test('CSRF token mismatch should be rejected', async () => {
    const response = await fetch('/api/guilds/test/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER_NAME]: 'invalid-token',
        Cookie: `${CSRF_COOKIE_NAME}=different-token`,
      },
      body: JSON.stringify({ test: 'data' }),
    });

    expect(response.status).toBe(403);
  });

  test('GET requests should not require CSRF token', async () => {
    const response = await fetch('/api/guilds/test/messages', {
      method: 'GET',
    });

    // Should not fail due to CSRF (may fail for other reasons)
    expect(response.status).not.toBe(403);
  });

  test('Webhook endpoints should be exempt from CSRF', async () => {
    const response = await fetch('/api/payments/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'test' }),
    });

    // Should not be rejected for CSRF
    expect(response.status).not.toBe(403);
  });
});
