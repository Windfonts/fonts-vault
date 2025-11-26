import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (credentials) => {
        try {
          const { username, password } = loginSchema.parse(credentials);

          // 验证环境变量中的管理员凭证
          const adminUsername = process.env.ADMIN_USERNAME;
          const adminPassword = process.env.ADMIN_PASSWORD;
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

          if (!adminUsername || !adminPassword) {
            throw new Error('管理员凭证未配置');
          }

          if (username === adminUsername && password === adminPassword) {
            return {
              id: '1',
              name: adminUsername,
              email: adminEmail,
              role: 'admin',
            };
          }

          return null;
        } catch (error) {
          console.error('认证错误:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },
  secret: process.env.AUTH_SECRET,
});
