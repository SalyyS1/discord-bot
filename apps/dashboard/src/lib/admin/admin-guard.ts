import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];

/**
 * Check if a user ID is an admin
 */
export function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * Server-side admin guard - redirects non-admins
 */
export async function requireAdmin() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: Object.fromEntries(headersList.entries()),
  });

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  if (!isAdmin(session.user.id)) {
    redirect('/dashboard');
  }

  return session;
}

/**
 * Check admin access without redirecting
 */
export async function checkAdminAccess(): Promise<boolean> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: Object.fromEntries(headersList.entries()),
  });
  return session?.user?.id ? isAdmin(session.user.id) : false;
}
