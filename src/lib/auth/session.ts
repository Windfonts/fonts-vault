import { auth } from '@/lib/auth/config';
import type { Session } from 'next-auth';
import { redirect } from 'next/navigation';

export async function getSession() {
  const disableAuth = process.env.DISABLE_AUTH === 'true';
  if (disableAuth) {
    const devSession: Session = {
      user: {
        id: 'dev-admin',
        name: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        role: 'admin',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    return devSession;
  }
  return await auth();
}

/**
 * Require authentication for server components
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/login');
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    redirect('/');
  }
  return session;
}
