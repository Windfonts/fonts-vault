import type { OAuthConfig } from 'next-auth/providers';

/**
 * 薇晓朵 WP OAuth Server（sso.weixiaoduo.com）→ NextAuth OAuth provider。
 * /oauth/me 返回 WP user->data + user_roles（见 wp-oauth-server includes/filters.php）。
 */
export type WeixiaoduoProfile = {
  ID?: string | number;
  id?: string | number;
  sub?: string | number;
  user_login?: string;
  user_email?: string;
  email?: string;
  display_name?: string;
  user_roles?: string[];
};

function env(name: string): string {
  return String(process.env[name] || '')
    .replace(/\r/g, '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

export function weixiaoduoOAuthProvider(): OAuthConfig<WeixiaoduoProfile> | null {
  const clientId = env('WEIXIAODUO_OAUTH_CLIENT_ID');
  const clientSecret = env('WEIXIAODUO_OAUTH_CLIENT_SECRET');
  const issuer = env('WEIXIAODUO_OAUTH_ISSUER') || 'https://sso.weixiaoduo.com';

  if (!clientId || !clientSecret) {
    return null;
  }

  const base = issuer.replace(/\/$/, '');

  return {
    id: 'weixiaoduo',
    name: '薇晓朵账户',
    type: 'oauth',
    clientId,
    clientSecret,
    authorization: {
      url: `${base}/oauth/authorize/`,
      params: {
        scope: 'basic',
        response_type: 'code',
      },
    },
    token: `${base}/oauth/token/`,
    userinfo: `${base}/oauth/me/`,
    checks: ['state'],
    profile(profile) {
      const id = String(profile.ID ?? profile.id ?? profile.sub ?? '');
      const roles = Array.isArray(profile.user_roles) ? profile.user_roles : [];
      const isAdmin = roles.some((r) =>
        ['administrator', 'admin', 'super admin', 'super_admin'].includes(
          String(r).toLowerCase(),
        ),
      );
      return {
        id: id || 'wp-unknown',
        name:
          String(profile.display_name || profile.user_login || '').trim() ||
          String(profile.user_email || profile.email || '')
            .split('@')[0] ||
          '用户',
        email: String(profile.user_email || profile.email || '').trim() || null,
        role: isAdmin ? 'admin' : 'user',
      };
    },
  };
}
