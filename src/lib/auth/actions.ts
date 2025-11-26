'use server';

import { signIn, signOut } from '@/lib/auth/config';
import { AuthError } from 'next-auth';

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: '用户名或密码错误' };
        default:
          return { success: false, error: '登录失败，请稍后重试' };
      }
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirect: false });
}
