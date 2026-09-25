import { logger } from '@/lib/logger';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { Provider } from 'next-auth/providers';
import { z } from 'zod';
import { weixiaoduoOAuthProvider } from '@/lib/auth/weixiaoduo-provider';

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const normalizeCredential = (value: string | undefined | null): string => {
  if (!value) {
    return '';
  }

  const withoutCarriageReturn = value.replace(/\r/g, '').trim();
  const isWrappedByDoubleQuotes =
    withoutCarriageReturn.startsWith('"') && withoutCarriageReturn.endsWith('"');
  const isWrappedBySingleQuotes =
    withoutCarriageReturn.startsWith("'") && withoutCarriageReturn.endsWith("'");

  if (isWrappedByDoubleQuotes || isWrappedBySingleQuotes) {
    return withoutCarriageReturn.slice(1, -1).trim();
  }

  return withoutCarriageReturn;
};

function buildProviders(): Provider[] {
  const providers: Provider[] = [
    Credentials({
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (credentials) => {
        try {
          const { username, password } = loginSchema.parse(credentials);
          const normalizedUsername = normalizeCredential(username);
          const normalizedPassword = normalizeCredential(password);

          const adminUsername = normalizeCredential(process.env.ADMIN_USERNAME);
          const adminPassword = normalizeCredential(process.env.ADMIN_PASSWORD);
          const adminEmail =
            normalizeCredential(process.env.ADMIN_EMAIL) || 'admin@example.com';

          if (!adminUsername || !adminPassword) {
            throw new Error('管理员凭证未配置');
          }

          if (normalizedUsername === adminUsername && normalizedPassword === adminPassword) {
            return {
              id: '1',
              name: adminUsername,
              email: adminEmail,
              role: 'admin',
            };
          }

          return null;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          if (err.message === '管理员凭证未配置') {
            logger.error('认证失败：管理员凭证未配置', {
              name: err.name,
              message: err.message,
            });
          } else {
            logger.debug('认证失败', {
              name: err.name,
              message: err.message,
              hasAdminUsername: Boolean(normalizeCredential(process.env.ADMIN_USERNAME)),
              hasAdminPassword: Boolean(normalizeCredential(process.env.ADMIN_PASSWORD)),
            });
          }
          return null;
        }
      },
    }),
  ];

  const oauth = weixiaoduoOAuthProvider();
  if (oauth) {
    providers.push(oauth);
  } else {
    logger.warn('WEIXIAODUO_OAUTH_CLIENT_* 未配置，顾客 SSO 未启用');
  }

  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: buildProviders(),
  pages: {
    signIn: '/login',
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
      }
      if (account?.provider === 'weixiaoduo') {
        token.provider = 'weixiaoduo';
        if (!token.role) token.role = 'user';
      }
      if (account?.provider === 'credentials') {
        token.provider = 'credentials';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || 'user';
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
