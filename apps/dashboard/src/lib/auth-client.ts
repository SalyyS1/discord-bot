import { createAuthClient } from 'better-auth/react';

// Use same origin (empty string) for auth to avoid CORS issues
// The auth endpoints should be on the same domain as the dashboard
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || ''),
});

export const { signIn, signUp, signOut, useSession } = authClient;
