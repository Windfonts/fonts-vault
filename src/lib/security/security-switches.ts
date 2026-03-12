import { db } from '@/lib/db/client';
import { securitySwitches, securitySwitchesAudit } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type SecuritySwitchKey =
  | 'domain_blacklist'
  | 'domain_whitelist'
  | 'ip_whitelist'
  | 'api_key_auth'
  | 'whitelist_rate_limit'
  | 'anonymous_daily_quota';

export type SecuritySwitchState = {
  key: SecuritySwitchKey;
  enabled: boolean;
  updatedAt: Date;
};

const DEFAULT_SWITCHES: Array<Pick<SecuritySwitchState, 'key' | 'enabled'>> = [
  { key: 'domain_blacklist', enabled: true },
  { key: 'domain_whitelist', enabled: true },
  { key: 'ip_whitelist', enabled: true },
  { key: 'api_key_auth', enabled: true },
  { key: 'whitelist_rate_limit', enabled: true },
  { key: 'anonymous_daily_quota', enabled: true },
];

const parseBoolean = (raw: string | undefined) => {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  return null;
};

const loadFileJson = async (filePath: string) => {
  const { readFile } = await import('fs/promises');
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as unknown;
};

const loadEnvOrFileOverrides = async () => {
  const jsonRaw = process.env.SECURITY_SWITCHES_JSON;
  if (jsonRaw) {
    try {
      return JSON.parse(jsonRaw) as unknown;
    } catch {
      return null;
    }
  }
  const filePath = process.env.SECURITY_SWITCHES_FILE;
  if (filePath) {
    try {
      return await loadFileJson(filePath);
    } catch {
      return null;
    }
  }
  return null;
};

const mergeOverrides = (
  base: Map<SecuritySwitchKey, SecuritySwitchState>,
  overrides: unknown
) => {
  if (!overrides || typeof overrides !== 'object') return base;
  const obj = overrides as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (!DEFAULT_SWITCHES.some((d) => d.key === k)) continue;
    const key = k as SecuritySwitchKey;
    const v = obj[k];
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    const enabledRaw = r['enabled'];
    const enabled =
      typeof enabledRaw === 'boolean'
        ? enabledRaw
        : typeof enabledRaw === 'string'
          ? parseBoolean(enabledRaw) ?? undefined
          : undefined;
    const current = base.get(key);
    if (!current) continue;
    base.set(key, {
      ...current,
      enabled: enabled ?? current.enabled,
    });
  }
  return base;
};

const TTL_MS = process.env.NODE_ENV === 'test' ? 0 : 5_000;
let cached: { at: number; value: Map<SecuritySwitchKey, SecuritySwitchState> } | null = null;

export const getSecuritySwitches = async () => {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;

  const base = new Map<SecuritySwitchKey, SecuritySwitchState>();
  for (const s of DEFAULT_SWITCHES) {
    base.set(s.key, { ...s, updatedAt: new Date(0) });
  }

  try {
    const rows = await db
      .select({
        key: securitySwitches.key,
        enabled: securitySwitches.enabled,
        updatedAt: securitySwitches.updatedAt,
      })
      .from(securitySwitches);

    for (const row of rows) {
      const key = row.key as SecuritySwitchKey;
      if (!base.has(key)) continue;
      base.set(key, {
        key,
        enabled: !!row.enabled,
        updatedAt: row.updatedAt ?? new Date(),
      });
    }
  } catch {
    if (cached) return cached.value;
  }

  const envOrFile = await loadEnvOrFileOverrides();
  mergeOverrides(base, envOrFile);

  cached = { at: now, value: base };
  return base;
};

export const ensureSecuritySwitchRow = async (key: SecuritySwitchKey) => {
  const existed = await db
    .select({ id: securitySwitches.id })
    .from(securitySwitches)
    .where(eq(securitySwitches.key, key))
    .limit(1);
  if (existed.length) return;

  const defaults = DEFAULT_SWITCHES.find((x) => x.key === key);
  const now = new Date();
  await db.insert(securitySwitches).values({
    id: crypto.randomUUID(),
    key,
    enabled: defaults?.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  });
};

export const evaluateSecuritySwitch = (state: SecuritySwitchState) => {
  if (!state.enabled) return false;
  return true;
};

export const clearSecuritySwitchCache = () => {
  cached = null;
};

export const writeSecuritySwitchAudit = async ({
  action,
  switchKey,
  actorId,
  actorEmail,
  before,
  after,
}: {
  action: 'create' | 'update' | 'delete';
  switchKey: string | null;
  actorId: string | null;
  actorEmail: string | null;
  before: unknown;
  after: unknown;
}) => {
  await db.insert(securitySwitchesAudit).values({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    action,
    switchKey,
    actorId,
    actorEmail,
    before: before == null ? null : JSON.stringify(before),
    after: after == null ? null : JSON.stringify(after),
  });
};
