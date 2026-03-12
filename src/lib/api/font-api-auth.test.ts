import { describe, expect, it, vi } from 'vitest';

type EqNode = { type: 'eq'; column: unknown; value: unknown };
type AndNode = { type: 'and'; conds: Array<EqNode | AndNode> };
type LtNode = { type: 'lt'; column: unknown; value: unknown };
type IncNode = { type: 'inc'; column: unknown; by: number };

vi.mock('drizzle-orm', () => {
  return {
    eq: (column: unknown, value: unknown): EqNode => ({ type: 'eq', column, value }),
    and: (...conds: Array<EqNode | AndNode>): AndNode => ({ type: 'and', conds }),
    sql: (strings: TemplateStringsArray, ...values: unknown[]): LtNode | IncNode | unknown => {
      if (strings.length === 3 && strings[1]?.includes('<')) {
        return { type: 'lt', column: values[0], value: values[1] } satisfies LtNode;
      }
      if (strings.length === 2 && strings[1]?.includes('+ 1')) {
        return { type: 'inc', column: values[0], by: 1 } satisfies IncNode;
      }
      return { type: 'raw_sql', strings: Array.from(strings), values };
    },
  };
});

const state = {
  whitelist: new Set<string>(),
  ipWhitelist: new Set<string>(),
  blacklist: new Set<string>(),
  usage: new Map<string, { id: string; count: number }>(),
  windowUsage: new Map<string, { id: string; count: number }>(),
  switches: new Map<
    string,
    { id: string; key: string; enabled: boolean; updatedAt: Date }
  >(),
};

const getColumnName = (column: unknown) => {
  const c = column as Record<string, unknown> | null;
  const name =
    (c && (c['name'] as string | undefined)) ||
    (c && (c['columnName'] as string | undefined)) ||
    (c && (c['_'] as Record<string, unknown> | undefined)?.['name'] as string | undefined) ||
    (c && (c['config'] as Record<string, unknown> | undefined)?.['name'] as string | undefined);
  return typeof name === 'string' ? name : '';
};

const flattenEqNodes = (node: EqNode | AndNode | unknown): EqNode[] => {
  if (!node || typeof node !== 'object') return [];
  const n = node as Record<string, unknown>;
  if (n['type'] === 'eq') return [node as EqNode];
  if (n['type'] === 'and') {
    const conds = (n['conds'] as unknown[]) || [];
    return conds.flatMap((x) => flattenEqNodes(x));
  }
  return [];
};

const flattenLtNodes = (node: LtNode | AndNode | unknown): LtNode[] => {
  if (!node || typeof node !== 'object') return [];
  const n = node as Record<string, unknown>;
  if (n['type'] === 'lt') return [node as LtNode];
  if (n['type'] === 'and') {
    const conds = (n['conds'] as unknown[]) || [];
    return conds.flatMap((x) => flattenLtNodes(x));
  }
  return [];
};

const whereToMap = (where: unknown) => {
  const out: Record<string, unknown> = {};
  for (const eqNode of flattenEqNodes(where)) {
    const key = getColumnName(eqNode.column);
    if (key) out[key] = eqNode.value;
  }
  return out;
};

vi.mock('@/lib/db/client', async () => {
  const schema = await import('@/lib/db/schema');

  const selectFrom = (table: unknown) => {
    const apiDomainBlacklist = schema.apiDomainBlacklist as unknown;
    const apiDomainWhitelist = schema.apiDomainWhitelist as unknown;
    const apiIpWhitelist = schema.apiIpWhitelist as unknown;
    const apiUsageDaily = schema.apiUsageDaily as unknown;
    const apiUsageWindow = schema.apiUsageWindow as unknown;
    const apiKeys = schema.apiKeys as unknown;
    const securitySwitches = schema.securitySwitches as unknown;

    const runner = (where: unknown) => {
      const map = whereToMap(where);
      if (table === apiDomainWhitelist) {
        const domain = String(map['domain'] ?? '');
        const ok = state.whitelist.has(domain);
        return ok ? [{ id: 'wl-1' }] : [];
      }
      if (table === apiIpWhitelist) {
        const ip = String(map['ip'] ?? '');
        const ok = state.ipWhitelist.has(ip);
        return ok ? [{ id: 'ip-1' }] : [];
      }
      if (table === apiDomainBlacklist) {
        const domain = String(map['domain'] ?? '');
        const ok = state.blacklist.has(domain);
        return ok ? [{ id: 'bl-1' }] : [];
      }
      if (table === apiUsageDaily) {
        const subject = String(map['subject'] ?? '');
        const day = String(map['day'] ?? '');
        const domain = String(map['domain'] ?? '');
        const ip = String(map['ip'] ?? '');
        const k = `${subject}|${day}|${domain}|${ip}`;
        const row = state.usage.get(k);
        return row ? [{ id: row.id, count: row.count }] : [];
      }
      if (table === apiUsageWindow) {
        const subject = String(map['subject'] ?? '');
        const window = String(map['window'] ?? '');
        const domain = String(map['domain'] ?? '');
        const k = `${subject}|${window}|${domain}`;
        const row = state.windowUsage.get(k);
        return row ? [{ id: row.id, count: row.count }] : [];
      }
      if (table === apiKeys) {
        return [];
      }
      if (table === securitySwitches) {
        const key = typeof map['key'] === 'string' ? String(map['key']) : null;
        if (key) {
          const row = state.switches.get(key);
          return row
            ? [
                {
                  id: row.id,
                  key: row.key,
                  enabled: row.enabled,
                  updatedAt: row.updatedAt,
                },
              ]
            : [];
        }
        return Array.from(state.switches.values()).map((row) => ({
          id: row.id,
          key: row.key,
          enabled: row.enabled,
          updatedAt: row.updatedAt,
        }));
      }
      return [];
    };

    return {
      where: (where: unknown) => ({
        limit: async (_n: number) => runner(where),
      }),
      orderBy: async () => runner(undefined),
      leftJoin: () => ({
        where: (where: unknown) => ({
          limit: async (_n: number) => runner(where),
        }),
      }),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(runner(undefined)).then(resolve, reject),
    };
  };

  const insertInto = (table: unknown) => {
    const apiUsageDaily = schema.apiUsageDaily as unknown;
    const apiUsageWindow = schema.apiUsageWindow as unknown;
    const apiDomainWhitelistAudit = schema.apiDomainWhitelistAudit as unknown;

    return {
      values: async (values: Record<string, unknown>) => {
        if (table === apiUsageDaily) {
          const subject = String(values['subject'] ?? '');
          const day = String(values['day'] ?? '');
          const domain = String(values['domain'] ?? '');
          const ip = String(values['ip'] ?? '');
          const count = Number(values['count'] ?? 0);
          const id = String(values['id'] ?? crypto.randomUUID());
          const k = `${subject}|${day}|${domain}|${ip}`;
          if (state.usage.has(k)) throw new Error('UNIQUE constraint failed');
          state.usage.set(k, { id, count });
          return [];
        }
        if (table === apiUsageWindow) {
          const subject = String(values['subject'] ?? '');
          const window = String(values['window'] ?? '');
          const domain = String(values['domain'] ?? '');
          const count = Number(values['count'] ?? 0);
          const id = String(values['id'] ?? crypto.randomUUID());
          const k = `${subject}|${window}|${domain}`;
          if (state.windowUsage.has(k)) throw new Error('UNIQUE constraint failed');
          state.windowUsage.set(k, { id, count });
          return [];
        }
        if (table === apiDomainWhitelistAudit) {
          return [];
        }
        return [];
      },
      returning: async () => [],
    };
  };

  const updateTable = (table: unknown) => {
    const apiUsageDaily = schema.apiUsageDaily as unknown;
    const apiUsageWindow = schema.apiUsageWindow as unknown;
    const apiKeys = schema.apiKeys as unknown;

    if (table === apiKeys) {
      return {
        set: (_values: Record<string, unknown>) => ({
          where: async (_where: unknown) => {
            return;
          },
        }),
      };
    }

    return {
      set: (values: Record<string, unknown>) => ({
        where: (where: unknown) => ({
          returning: async (_fields: unknown) => {
            if (table === apiUsageDaily) {
              const map = whereToMap(where);
              const subject = String(map['subject'] ?? '');
              const day = String(map['day'] ?? '');
              const domain = String(map['domain'] ?? '');
              const ip = String(map['ip'] ?? '');
              const k = `${subject}|${day}|${domain}|${ip}`;
              const row = state.usage.get(k);
              if (!row) return [];

              const ltNodes = flattenLtNodes(where);
              const quotaNode = ltNodes.find((n) => getColumnName(n.column) === 'count');
              const quota = quotaNode ? Number(quotaNode.value) : Number.POSITIVE_INFINITY;
              if (Number.isFinite(quota) && row.count >= quota) return [];

              const countValue = values['count'];
              const nextCount =
                typeof countValue === 'number'
                  ? Number(countValue)
                  : countValue && typeof countValue === 'object' && (countValue as any).type === 'inc'
                    ? row.count + Number((countValue as any).by ?? 1)
                    : row.count;

              state.usage.set(k, { id: row.id, count: nextCount });
              return [{ count: nextCount }];
            }

            if (table === apiUsageWindow) {
              const map = whereToMap(where);
              const subject = String(map['subject'] ?? '');
              const window = String(map['window'] ?? '');
              const domain = String(map['domain'] ?? '');
              const k = `${subject}|${window}|${domain}`;
              const row = state.windowUsage.get(k);
              if (!row) return [];

              const ltNodes = flattenLtNodes(where);
              const quotaNode = ltNodes.find((n) => getColumnName(n.column) === 'count');
              const quota = quotaNode ? Number(quotaNode.value) : Number.POSITIVE_INFINITY;
              if (Number.isFinite(quota) && row.count >= quota) return [];

              const countValue = values['count'];
              const nextCount =
                typeof countValue === 'number'
                  ? Number(countValue)
                  : countValue && typeof countValue === 'object' && (countValue as any).type === 'inc'
                    ? row.count + Number((countValue as any).by ?? 1)
                    : row.count;

              state.windowUsage.set(k, { id: row.id, count: nextCount });
              return [{ count: nextCount }];
            }

            return [];
          },
        }),
      }),
    };
  };

  const deleteFrom = () => ({
    where: async () => [],
    returning: async () => [],
  });

  const db = {
    select: (_fields?: unknown) => ({
      from: (table: unknown) => selectFrom(table),
    }),
    insert: (table: unknown) => insertInto(table),
    update: (table: unknown) => updateTable(table),
    delete: (_table: unknown) => deleteFrom(),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: (_fields?: unknown) => ({
          from: (table: unknown) => selectFrom(table),
        }),
        insert: (table: unknown) => insertInto(table),
        update: (table: unknown) => updateTable(table),
      };
      return cb(tx);
    },
  };

  return { db };
});

const makeRequest = ({
  url = 'https://api.example.test/api/fonts',
  origin,
  referer,
  host = 'api.example.test',
  ip = '1.1.1.1',
  apiKey,
}: {
  url?: string;
  origin?: string;
  referer?: string;
  host?: string;
  ip?: string;
  apiKey?: string;
}) => {
  const headers = new Headers();
  headers.set('host', host);
  headers.set('x-forwarded-for', ip);
  if (origin) headers.set('origin', origin);
  if (referer) headers.set('referer', referer);
  if (apiKey) headers.set('x-api-key', apiKey);
  return new Request(url, { headers });
};

describe('domain whitelist auth', () => {
  it('whitelisted domain can access without api key and without quota consumption', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    state.whitelist.add('allow.example.com');

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://allow.example.com', host: 'api.windfonts.test' }),
      { allowWhitelist: true }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx.apiKey).toBe(null);
      expect(result.ctx.quota.limit).toBe(Number.MAX_SAFE_INTEGER);
      expect(state.usage.size).toBe(0);
      expect(state.windowUsage.size).toBe(1);
    }
  });

  it('non-whitelisted domain consumes anonymous quota', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');

    const r1 = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://other.example.com', host: 'api.windfonts.test' }),
      { allowWhitelist: true, allowAnonymous: true }
    );
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      expect(r1.ctx.quota.limit).toBe(100);
      expect(r1.ctx.quota.used).toBe(1);
      expect(r1.ctx.quota.remaining).toBe(99);
    }

    const r2 = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://other.example.com', host: 'api.windfonts.test' }),
      { allowWhitelist: true, allowAnonymous: true }
    );
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.ctx.quota.used).toBe(2);
      expect(r2.ctx.quota.remaining).toBe(98);
    }
  });

  it('requireKey rejects missing key even if anonymous is allowed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://other.example.com', host: 'api.windfonts.test' }),
      { requireKey: true }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.errorCode).toBe('missing_api_key');
    }
  });

  it('blacklisted domain is rejected', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    state.blacklist.add('blocked.example.com');

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://blocked.example.com', host: 'api.windfonts.test' }),
      { allowAnonymous: true }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.errorCode).toBe('domain_blocked');
    }
  });

  it('blacklist can be disabled by security switch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    state.blacklist.add('blocked.example.com');
    state.switches.set('domain_blacklist', {
      id: 'sw-1',
      key: 'domain_blacklist',
      enabled: false,
      updatedAt: new Date(),
    });

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://blocked.example.com', host: 'api.windfonts.test' }),
      { allowAnonymous: true }
    );

    expect(result.ok).toBe(true);
  });

  it('invalid api key format is rejected', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({
        origin: 'https://other.example.com',
        host: 'api.windfonts.test',
        apiKey: 'bad_key',
      }),
      {}
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.errorCode).toBe('invalid_api_key_format');
    }
  });

  it('whitelisted domain ignores invalid api key and still allows access', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    state.whitelist.add('allow.example.com');

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({
        origin: 'https://allow.example.com',
        host: 'api.windfonts.test',
        apiKey: 'bad_key',
      }),
      { allowWhitelist: true }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx.apiKey).toBe(null);
      expect(result.ctx.domain).toBe('allow.example.com');
    }
  });

  it('whitelist can be disabled by security switch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    state.whitelist.add('allow.example.com');
    state.switches.set('domain_whitelist', {
      id: 'sw-2',
      key: 'domain_whitelist',
      enabled: false,
      updatedAt: new Date(),
    });

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://allow.example.com', host: 'api.windfonts.test' }),
      { allowWhitelist: true, allowAnonymous: true }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx.quota.limit).toBe(100);
    }
  });

  it('ip whitelist allows access without api key', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '600';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    state.ipWhitelist.add('1.1.1.1');

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const result = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://other.example.com', host: 'api.windfonts.test', ip: '1.1.1.1' }),
      { allowAnonymous: true }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx.apiKey).toBe(null);
      expect(result.ctx.quota.limit).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it('whitelisted domain is rate limited per minute', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.WHITELIST_PER_MINUTE_LIMIT = '1';

    state.whitelist.clear();
    state.ipWhitelist.clear();
    state.blacklist.clear();
    state.usage.clear();
    state.windowUsage.clear();
    state.switches.clear();

    state.whitelist.add('allow.example.com');

    const { authorizeFontApiRequest } = await import('@/lib/api/font-api-auth');
    const r1 = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://allow.example.com', host: 'api.windfonts.test' }),
      { allowWhitelist: true }
    );
    expect(r1.ok).toBe(true);

    const r2 = await authorizeFontApiRequest(
      makeRequest({ origin: 'https://allow.example.com', host: 'api.windfonts.test' }),
      { allowWhitelist: true }
    );
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.status).toBe(429);
      expect(r2.errorCode).toBe('rate_limited');
    }
  });
});
