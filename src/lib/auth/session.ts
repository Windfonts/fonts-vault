import { auth } from '@/lib/auth/config';

export async function getSession() {
  const disableAuth = process.env.DISABLE_AUTH === 'true';
  if (disableAuth) {
    return {
      user: {
        id: 'dev-admin',
        name: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        role: 'admin',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as any;
  }
  return await auth();
}

export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('未授权访问');
  }

  return session;
}
