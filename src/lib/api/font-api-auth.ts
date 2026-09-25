import { db } from '@/lib/db/client';
import {
  apiDomainBlacklist,
  apiDomainWhitelist,
  apiIpWhitelist,
  apiKeys,
  apiPlans,
  apiUsageDaily,
  apiUsageWindow,
} from '@/lib/db/schema';
import { evaluateSecuritySwitch, getSecuritySwitches } from '@/lib/security/security-switches';
import { createHash } from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { isIP } from 'net';
import { NextResponse } from 'next/server';

export type FontApiAuthContext = {
  domain: string;
  ip: string;
  day: string;
  apiKey: {
    id: string;
    name: string;
    ownerEmail: string | null;
    expiresAt: Date | null;
    plan: { id: string; name: string; slug: string; dailyQuota: number } | null;
  } | null;
  quota: {
    limit: number;
    used: number;
    remaining: number;
  };
};

type ApiAuthResult =
  | { ok: true; ctx: FontApiAuthContext }
  | {
      ok: false;
      response: Response;
      status: number;
      errorCode: string;
      errorMessage: string;
      ctx: Partial<FontApiAuthContext>;
    };

const ANON_DAILY_QUOTA = 100;
const DEFAULT_KEY_DAILY_QUOTA = 1000;

const getWhitelistPerMinuteLimit = () => {
  const raw = process.env.WHITELIST_PER_MINUTE_LIMIT ?? '600';
  const n = Number(raw);
  return Number.isFinite(n) ? n : 600;
};

const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

const base36Pad4 = (n: number) => n.toString(36).toUpperCase().padStart(4, '0');

const computeChecksum = (payload: string) => {
  const h = createHash('sha256').update(payload).digest();
  const n = h.readUInt32BE(0) % 36 ** 4;
  return base36Pad4(n);
};

const parseApiKey = (raw: string) => {
  const key = raw.trim();
  const parts = key.split('_');
  if (parts.length !== 4) return null;
  const [tag, prefix, random, checksum] = parts;
  if (tag !== 'wf') return null;
  if (!prefix || prefix.length > 12) return null;
  if (!random || random.length < 16 || random.length > 64) return null;
  if (!checksum || checksum.length !== 4) return null;
  const payload = `${tag}_${prefix}_${random}`;
  const expected = computeChecksum(payload);
  if (expected !== checksum.toUpperCase()) return null;
  return { key, prefix, random, checksum: checksum.toUpperCase(), payload };
};

const getHeaderFirst = (headers: Headers, name: string) => {
  const v = headers.get(name);
  return v ? v.trim() : null;
};

const getApiKeyFromRequest = (request: Request) => {
  const fromQuery = (() => {
    try {
      const url = new URL(request.url);
      const v =
        url.searchParams.get('apiKey') ||
        url.searchParams.get('key') ||
        url.searchParams.get('api_key');
      return v ? v.trim() : null;
    } catch {
      return null;
    }
  })();
  if (fromQuery) return fromQuery;

  const headers = request.headers;
  const fromX = getHeaderFirst(headers, 'x-api-key');
  if (fromX) return fromX;
  const auth = getHeaderFirst(headers, 'authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
};

const getDomainFromRequest = (request: Request) => {
  const headers = request.headers;
  const origin = getHeaderFirst(headers, 'origin');
  if (origin) {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  const referer = getHeaderFirst(headers, 'referer');
  if (referer) {
    try {
      return new URL(referer).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  return null;
};

const getHostFromRequest = (request: Request) => {
  const host =
    getHeaderFirst(request.headers, 'x-forwarded-host') || getHeaderFirst(request.headers, 'host');
  return host ? host.split(':')[0].toLowerCase() : null;
};

const getOriginDomainFromRequest = (request: Request) => {
  const origin = getHeaderFirst(request.headers, 'origin');
  if (!origin) return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const isDevDomain = (host: string) => {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.test')
  );
};

const isSystemDomain = (domain: string, request: Request) => {
  const host = getHostFromRequest(request);
  if (!host) return false;
  if (!isDevDomain(host)) return false;
  if (domain === host) return true;
  return isDevDomain(domain);
};

const getIpFromRequest = (request: Request) => {
  const headers = request.headers;
  const xri = getHeaderFirst(headers, 'x-real-ip');
  if (xri && isIP(xri) !== 0) return xri;

  const xff = getHeaderFirst(headers, 'x-forwarded-for');
  if (!xff) return '';
  const ip = xff.split(',')[0]?.trim() || '';
  return isIP(ip) !== 0 ? ip : '';
};

const jsonError = (status: number, errorCode: string, errorMessage: string) => {
  return NextResponse.json(
    { code: status, errorCode, message: errorMessage },
    { status, headers: { 'cache-control': 'no-store' } }
  );
};

const getToday = () => new Date().toISOString().slice(0, 10);

const isBlockedDomain = async (domain: string) => {
  if (!domain) return false;
  const row = await db
    .select({ id: apiDomainBlacklist.id })
    .from(apiDomainBlacklist)
    .where(and(eq(apiDomainBlacklist.domain, domain), eq(apiDomainBlacklist.isActive, true)))
    .limit(1);
  return !!row.length;
};

const isWhitelistedDomain = async (domain: string) => {
  const row = await db
    .select({ id: apiDomainWhitelist.id })
    .from(apiDomainWhitelist)
    .where(and(eq(apiDomainWhitelist.domain, domain), eq(apiDomainWhitelist.isActive, true)))
    .limit(1);
  return !!row.length;
};

const isWhitelistedIp = async (ip: string) => {
  if (!ip) return false;
  const row = await db
    .select({ id: apiIpWhitelist.id })
    .from(apiIpWhitelist)
    .where(and(eq(apiIpWhitelist.ip, ip), eq(apiIpWhitelist.isActive, true)))
    .limit(1);
  return !!row.length;
};

const resolveApiKey = async (key: string) => {
  const keyHash = sha256Hex(key);
  const row = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      ownerEmail: apiKeys.ownerEmail,
      status: apiKeys.status,
      expiresAt: apiKeys.expiresAt,
      planId: apiKeys.planId,
      planName: apiPlans.name,
      planSlug: apiPlans.slug,
      planDailyQuota: apiPlans.dailyQuota,
      planActive: apiPlans.isActive,
    })
    .from(apiKeys)
    .leftJoin(apiPlans, eq(apiKeys.planId, apiPlans.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row.length) return { ok: false as const, reason: 'invalid' as const };
  const r = row[0];
  if (r.status !== 'active') return { ok: false as const, reason: 'revoked' as const };
  if (r.expiresAt && r.expiresAt.getTime() < Date.now())
    return { ok: false as const, reason: 'expired' as const };

  const plan =
    r.planId && r.planName && r.planSlug && r.planDailyQuota && r.planActive
      ? { id: r.planId, name: r.planName, slug: r.planSlug, dailyQuota: r.planDailyQuota }
      : null;

  const dailyQuota = plan?.dailyQuota ?? DEFAULT_KEY_DAILY_QUOTA;

  return {
    ok: true as const,
    apiKey: {
      id: r.id,
      name: r.name,
      ownerEmail: r.ownerEmail ?? null,
      expiresAt: r.expiresAt ?? null,
      plan,
    },
    dailyQuota,
  };
};

const consumeQuota = async ({
  subject,
  keyId,
  day,
  domain,
  ip,
  quota,
}: {
  subject: string;
  keyId: string | null;
  day: string;
  domain: string;
  ip: string;
  quota: number;
}) => {
  const normalizedIp = ip || '';
  const normalizedDomain = domain || 'unknown';
  const now = new Date();

  return db.transaction(async (tx) => {
    if (quota < 1) return { ok: false as const, used: 0, remaining: 0 };

    try {
      await tx.insert(apiUsageDaily).values({
        id: crypto.randomUUID(),
        day,
        subject,
        keyId,
        domain: normalizedDomain,
        ip: normalizedIp,
        count: 1,
        updatedAt: now,
      });
      return { ok: true as const, used: 1, remaining: Math.max(0, quota - 1) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const conflict = message.includes('UNIQUE') || message.includes('constraint');
      if (!conflict) throw error;
    }

    const updated = await tx
      .update(apiUsageDaily)
      .set({ count: sql`${apiUsageDaily.count} + 1`, updatedAt: now })
      .where(
        and(
          eq(apiUsageDaily.subject, subject),
          eq(apiUsageDaily.day, day),
          eq(apiUsageDaily.domain, normalizedDomain),
          eq(apiUsageDaily.ip, normalizedIp),
          sql`${apiUsageDaily.count} < ${quota}`
        )
      )
      .returning({ count: apiUsageDaily.count });

    if (updated.length) {
      const used = Number(updated[0].count);
      return { ok: true as const, used, remaining: Math.max(0, quota - used) };
    }

    const existing = await tx
      .select({ count: apiUsageDaily.count })
      .from(apiUsageDaily)
      .where(
        and(
          eq(apiUsageDaily.subject, subject),
          eq(apiUsageDaily.day, day),
          eq(apiUsageDaily.domain, normalizedDomain),
          eq(apiUsageDaily.ip, normalizedIp)
        )
      )
      .limit(1);
    const used = existing.length ? Number(existing[0].count) : quota;
    return { ok: false as const, used, remaining: 0 };
  });
};

const getMinuteWindow = (now: Date) => now.toISOString().slice(0, 16);

const consumeWindowQuota = async ({
  subject,
  window,
  domain,
  quota,
}: {
  subject: string;
  window: string;
  domain: string;
  quota: number;
}) => {
  const normalizedDomain = domain || 'unknown';
  const now = new Date();

  return db.transaction(async (tx) => {
    if (quota < 1) return { ok: false as const, used: 0, remaining: 0 };

    try {
      await tx.insert(apiUsageWindow).values({
        id: crypto.randomUUID(),
        window,
        subject,
        domain: normalizedDomain,
        count: 1,
        updatedAt: now,
      });
      return { ok: true as const, used: 1, remaining: Math.max(0, quota - 1) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const conflict = message.includes('UNIQUE') || message.includes('constraint');
      if (!conflict) throw error;
    }

    const updated = await tx
      .update(apiUsageWindow)
      .set({ count: sql`${apiUsageWindow.count} + 1`, updatedAt: now })
      .where(
        and(
          eq(apiUsageWindow.subject, subject),
          eq(apiUsageWindow.window, window),
          eq(apiUsageWindow.domain, normalizedDomain),
          sql`${apiUsageWindow.count} < ${quota}`
        )
      )
      .returning({ count: apiUsageWindow.count });

    if (updated.length) {
      const used = Number(updated[0].count);
      return { ok: true as const, used, remaining: Math.max(0, quota - used) };
    }

    const existing = await tx
      .select({ count: apiUsageWindow.count })
      .from(apiUsageWindow)
      .where(
        and(
          eq(apiUsageWindow.subject, subject),
          eq(apiUsageWindow.window, window),
          eq(apiUsageWindow.domain, normalizedDomain)
        )
      )
      .limit(1);
    const used = existing.length ? Number(existing[0].count) : quota;
    return { ok: false as const, used, remaining: 0 };
  });
};

export type FontApiAuthOptions = {
  requireKey?: boolean;
  allowWhitelist?: boolean;
  allowAnonymous?: boolean;
  /** 公开投递（如 /api/css）跳过匿名日额度；仍走黑名单等其它闸 */
  skipAnonymousQuota?: boolean;
};

export const authorizeFontApiRequest = async (
  request: Request,
  options?: FontApiAuthOptions
): Promise<ApiAuthResult> => {
  const domain = getDomainFromRequest(request) ?? 'unknown';
  const ip = getIpFromRequest(request) ?? '';
  const day = getToday();

  const requireKey = options?.requireKey === true;
  const switches = await getSecuritySwitches();
  const allowWhitelist =
    options?.allowWhitelist !== false &&
    evaluateSecuritySwitch(switches.get('domain_whitelist')!);
  const allowIpWhitelist = evaluateSecuritySwitch(switches.get('ip_whitelist')!);
  const allowBlacklist = evaluateSecuritySwitch(switches.get('domain_blacklist')!);
  const allowKeyAuth = evaluateSecuritySwitch(switches.get('api_key_auth')!);
  const allowWhitelistRateLimit = evaluateSecuritySwitch(switches.get('whitelist_rate_limit')!);
  const allowAnonymous = options?.allowAnonymous !== false;
  const allowAnonymousQuota =
    options?.skipAnonymousQuota !== true &&
    evaluateSecuritySwitch(switches.get('anonymous_daily_quota')!);

  const rawKey = getApiKeyFromRequest(request);

  if (allowBlacklist) {
    const blocked = (await isBlockedDomain(domain)) || (ip ? await isBlockedDomain(ip) : false);
    if (blocked) {
      return {
        ok: false,
        response: jsonError(403, 'domain_blocked', '该网站已被屏蔽，无法调用 API'),
        status: 403,
        errorCode: 'domain_blocked',
        errorMessage: '域名被屏蔽',
        ctx: { domain, ip, day, apiKey: null },
      };
    }
  }

  const systemDomain = !requireKey && isSystemDomain(domain, request);
  const originDomain = getOriginDomainFromRequest(request);
  const whitelisted =
    !requireKey && allowWhitelist && originDomain ? await isWhitelistedDomain(originDomain) : false;
  const ipWhitelisted = !requireKey && allowIpWhitelist ? await isWhitelistedIp(ip) : false;

  if (systemDomain || whitelisted || ipWhitelisted) {
    if (allowWhitelistRateLimit) {
      const perMinuteLimit = getWhitelistPerMinuteLimit();
      if (perMinuteLimit > 0) {
        const subject = whitelisted ? 'whitelist' : ipWhitelisted ? 'ip_whitelist' : 'system';
        const window = getMinuteWindow(new Date());
        const usedResult = await consumeWindowQuota({
          subject,
          window,
          domain: whitelisted ? originDomain ?? domain : ipWhitelisted ? ip || 'unknown' : domain,
          quota: perMinuteLimit,
        });
        if (!usedResult.ok) {
          return {
            ok: false,
            response: jsonError(429, 'rate_limited', '请求过于频繁'),
            status: 429,
            errorCode: 'rate_limited',
            errorMessage: '请求过于频繁',
            ctx: { domain, ip, day, apiKey: null },
          };
        }
      }
    }
    const unlimited = Number.MAX_SAFE_INTEGER;
    const effectiveDomain = whitelisted ? originDomain ?? domain : domain;
    return {
      ok: true,
      ctx: {
        domain: effectiveDomain,
        ip,
        day,
        apiKey: null,
        quota: { limit: unlimited, used: 0, remaining: unlimited },
      },
    };
  }

  if (rawKey && (requireKey || allowKeyAuth)) {
    const parsed = parseApiKey(rawKey);
    if (!parsed) {
      return {
        ok: false,
        response: jsonError(401, 'invalid_api_key_format', 'API 密钥格式或校验位不正确'),
        status: 401,
        errorCode: 'invalid_api_key_format',
        errorMessage: 'API 密钥格式或校验位不正确',
        ctx: { domain, ip, day, apiKey: null },
      };
    }

    const resolved = await resolveApiKey(parsed.key);
    if (!resolved.ok) {
      const errorCode =
        resolved.reason === 'revoked'
          ? 'api_key_revoked'
          : resolved.reason === 'expired'
            ? 'api_key_expired'
            : 'invalid_api_key';
      const message =
        resolved.reason === 'revoked'
          ? 'API 密钥已被吊销'
          : resolved.reason === 'expired'
            ? 'API 密钥已过期'
            : 'API 密钥无效';
      return {
        ok: false,
        response: jsonError(401, errorCode, message),
        status: 401,
        errorCode,
        errorMessage: message,
        ctx: { domain, ip, day, apiKey: null },
      };
    }

    const subject = resolved.apiKey.id;
    const quota = resolved.dailyQuota;
    const usedResult = await consumeQuota({
      subject,
      keyId: resolved.apiKey.id,
      day,
      domain,
      ip,
      quota,
    });

    if (!usedResult.ok) {
      return {
        ok: false,
        response: jsonError(429, 'rate_limited', '已超过今日 API 调用额度'),
        status: 429,
        errorCode: 'rate_limited',
        errorMessage: '已超过今日 API 调用额度',
        ctx: {
          domain,
          ip,
          day,
          apiKey: resolved.apiKey,
          quota: { limit: quota, used: usedResult.used, remaining: 0 },
        },
      };
    }

    db.update(apiKeys)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(apiKeys.id, resolved.apiKey.id))
      .catch(() => undefined);

    return {
      ok: true,
      ctx: {
        domain,
        ip,
        day,
        apiKey: resolved.apiKey,
        quota: { limit: quota, used: usedResult.used, remaining: usedResult.remaining },
      },
    };
  }

  if (requireKey) {
    return {
      ok: false,
      response: jsonError(
        401,
        'missing_api_key',
        '缺少 API 密钥（请使用 x-api-key 或 Authorization: Bearer 传递）'
      ),
      status: 401,
      errorCode: 'missing_api_key',
      errorMessage: '缺少 API 密钥',
      ctx: { domain, ip, day, apiKey: null },
    };
  }

  if (!allowAnonymous) {
    return {
      ok: false,
      response: jsonError(
        401,
        'missing_api_key',
        '缺少 API 密钥（请使用 x-api-key 或 Authorization: Bearer 传递）'
      ),
      status: 401,
      errorCode: 'missing_api_key',
      errorMessage: '缺少 API 密钥',
      ctx: { domain, ip, day, apiKey: null },
    };
  }

  if (!allowAnonymousQuota) {
    const unlimited = Number.MAX_SAFE_INTEGER;
    return {
      ok: true,
      ctx: {
        domain,
        ip,
        day,
        apiKey: null,
        quota: { limit: unlimited, used: 0, remaining: unlimited },
      },
    };
  }

  const usedResult = await consumeQuota({
    subject: 'anon',
    keyId: null,
    day,
    domain,
    ip,
    quota: ANON_DAILY_QUOTA,
  });

  if (!usedResult.ok) {
    return {
      ok: false,
      response: jsonError(429, 'rate_limited', '未验证网站已超过今日基础额度（100 次/天）'),
      status: 429,
      errorCode: 'rate_limited',
      errorMessage: '未验证网站已超过今日基础额度',
      ctx: {
        domain,
        ip,
        day,
        apiKey: null,
        quota: { limit: ANON_DAILY_QUOTA, used: usedResult.used, remaining: 0 },
      },
    };
  }

  return {
    ok: true,
    ctx: {
      domain,
      ip,
      day,
      apiKey: null,
      quota: { limit: ANON_DAILY_QUOTA, used: usedResult.used, remaining: usedResult.remaining },
    },
  };
};

const PUBLIC_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

const withPublicCors = (response: Response) => {
  for (const [key, value] of Object.entries(PUBLIC_CORS)) {
    response.headers.set(key, value);
  }
  return response;
};

export const withFontApiAuth =
  (
    handler: (request: Request, ctx: FontApiAuthContext) => Promise<Response> | Response,
    options?: FontApiAuthOptions
  ) =>
  async (request: Request) => {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
    }

    const auth = await authorizeFontApiRequest(request, options);

    if (!auth.ok) {
      return withPublicCors(auth.response);
    }

    try {
      const response = await handler(request, auth.ctx);
      return withPublicCors(response);
    } catch (error) {
      return withPublicCors(jsonError(500, 'internal_error', '服务器内部错误'));
    }
  };

export const generateApiKey = (keyPrefix: string) => {
  const normalizedPrefix = (keyPrefix || 'live').toLowerCase().slice(0, 12);
  const random = createHash('sha256')
    .update(`${crypto.randomUUID()}-${Date.now()}`)
    .digest('base64url');
  const randomPart = random.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  const payload = `wf_${normalizedPrefix}_${randomPart}`;
  const checksum = computeChecksum(payload);
  const key = `${payload}_${checksum}`;
  return { key, keyHash: sha256Hex(key), checksum, keyPrefix: normalizedPrefix };
};

/** 形态校验（含校验和）；不查库。控制台自签 Key 发布项目用。 */
export const isWellFormedApiKey = (raw: string | null | undefined): boolean =>
  !!parseApiKey(String(raw || ''));
