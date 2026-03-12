import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { logger } from '../logger';
import * as schema from './schema';

// 获取数据库路径
const getDatabasePath = (): string => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return 'file::memory:';
  }
  return process.env.DATABASE_URL || 'file:./data/dev.db';
};

// 确保数据库目录存在
const ensureDbDirectory = (dbUrl: string): void => {
  const dbPath = dbUrl.replace('file:', '');
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

type ExecuteStatement =
  | string
  | {
      sql: string;
      args?: Array<string | number | null>;
    };

const createExecuteWithRetry = (client: ReturnType<typeof createClient>) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const isBusy = (error: unknown) => {
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && code.startsWith('SQLITE_BUSY');
  };
  return async (stmt: ExecuteStatement) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        return await client.execute(stmt);
      } catch (error) {
        if (!isBusy(error) || attempt === 5) throw error;
        await sleep(50 * (attempt + 1));
      }
    }
    throw new Error('executeWithRetry_failed');
  };
};

const bootstrapCoreTables = async (client: ReturnType<typeof createClient>) => {
  const executeWithRetry = createExecuteWithRetry(client);
  const statements = [
    `CREATE TABLE IF NOT EXISTS brands (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      logo_url text,
      banner_url text,
      description text,
      website text,
      social_links text,
      status text NOT NULL DEFAULT 'published',
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS categories (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL UNIQUE,
      slug text NOT NULL UNIQUE,
      description text,
      "order" integer NOT NULL DEFAULT 0,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS styles (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL UNIQUE,
      slug text NOT NULL UNIQUE,
      description text,
      "order" integer NOT NULL DEFAULT 0,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS fonts (
      id text PRIMARY KEY NOT NULL,
      normalized_name text NOT NULL UNIQUE,
      name text NOT NULL,
      english_name text,
      chinese_name text,
      font_family text NOT NULL,
      original_name text,
      weights text NOT NULL,
      version text NOT NULL,
      copyright text,
      description text,
      designer text,
      foundry text,
      release_year integer,
      category text,
      font_category text,
      style text,
      category_id text,
      brand_id text,
      tags text DEFAULT '[]',
      font_tags text DEFAULT '[]',
      languages text DEFAULT '[]',
      use_cases text DEFAULT '[]',
      license text,
      license_type text,
      price real,
      purchase_url text,
      license_description text,
      oss_path text NOT NULL,
      view_count integer DEFAULT 0 NOT NULL,
      download_count integer DEFAULT 0 NOT NULL,
      api_call_count integer DEFAULT 0 NOT NULL,
      status text DEFAULT 'published' NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE no action ON DELETE set null,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON UPDATE no action ON DELETE set null
    );`,
    `CREATE INDEX IF NOT EXISTS fonts_name_idx ON fonts (name);`,
    `CREATE INDEX IF NOT EXISTS fonts_family_idx ON fonts (font_family);`,
    `CREATE INDEX IF NOT EXISTS fonts_category_idx ON fonts (category_id);`,
    `CREATE INDEX IF NOT EXISTS fonts_brand_idx ON fonts (brand_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS styles_name_unique ON styles (name);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS styles_slug_unique ON styles (slug);`,
  ];

  for (const sql of statements) {
    await executeWithRetry(sql);
  }
};

const bootstrapApiTables = async (client: ReturnType<typeof createClient>) => {
  const executeWithRetry = createExecuteWithRetry(client);
  const statements = [
    `CREATE TABLE IF NOT EXISTS api_plans (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      slug text NOT NULL,
      daily_quota integer NOT NULL,
      is_active integer DEFAULT 1 NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS api_plans_slug_unique ON api_plans (slug);`,
    `CREATE INDEX IF NOT EXISTS api_plans_active_idx ON api_plans (is_active);`,
    `CREATE TABLE IF NOT EXISTS api_keys (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      key_prefix text NOT NULL,
      key_hash text NOT NULL,
      checksum text NOT NULL,
      plan_id text,
      owner_email text,
      status text DEFAULT 'active' NOT NULL,
      revoked_at integer,
      expires_at integer,
      last_used_at integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES api_plans(id) ON UPDATE no action ON DELETE set null
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_unique ON api_keys (key_hash);`,
    `CREATE INDEX IF NOT EXISTS api_keys_status_idx ON api_keys (status);`,
    `CREATE INDEX IF NOT EXISTS api_keys_plan_idx ON api_keys (plan_id);`,
    `CREATE INDEX IF NOT EXISTS api_keys_owner_idx ON api_keys (owner_email);`,
    `CREATE TABLE IF NOT EXISTS api_domain_blacklist (
      id text PRIMARY KEY NOT NULL,
      domain text NOT NULL,
      reason text,
      is_active integer DEFAULT 1 NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS api_domain_blacklist_domain_unique ON api_domain_blacklist (domain);`,
    `CREATE INDEX IF NOT EXISTS api_domain_blacklist_active_idx ON api_domain_blacklist (is_active);`,
    `CREATE TABLE IF NOT EXISTS api_domain_whitelist (
      id text PRIMARY KEY NOT NULL,
      domain text NOT NULL,
      note text,
      is_active integer DEFAULT 1 NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS api_domain_whitelist_domain_unique ON api_domain_whitelist (domain);`,
    `CREATE INDEX IF NOT EXISTS api_domain_whitelist_active_idx ON api_domain_whitelist (is_active);`,
    `CREATE TABLE IF NOT EXISTS api_domain_whitelist_audit (
      id text PRIMARY KEY NOT NULL,
      created_at integer NOT NULL,
      action text NOT NULL,
      whitelist_id text,
      domain text,
      actor_id text,
      actor_email text,
      before text,
      after text
    );`,
    `CREATE INDEX IF NOT EXISTS api_domain_whitelist_audit_created_at_idx ON api_domain_whitelist_audit (created_at);`,
    `CREATE INDEX IF NOT EXISTS api_domain_whitelist_audit_action_idx ON api_domain_whitelist_audit (action);`,
    `CREATE INDEX IF NOT EXISTS api_domain_whitelist_audit_domain_idx ON api_domain_whitelist_audit (domain);`,
    `CREATE INDEX IF NOT EXISTS api_domain_whitelist_audit_actor_idx ON api_domain_whitelist_audit (actor_email);`,
    `CREATE TABLE IF NOT EXISTS api_ip_whitelist (
      id text PRIMARY KEY NOT NULL,
      ip text NOT NULL,
      note text,
      is_active integer DEFAULT 1 NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS api_ip_whitelist_ip_unique ON api_ip_whitelist (ip);`,
    `CREATE INDEX IF NOT EXISTS api_ip_whitelist_active_idx ON api_ip_whitelist (is_active);`,
    `CREATE TABLE IF NOT EXISTS api_ip_whitelist_audit (
      id text PRIMARY KEY NOT NULL,
      created_at integer NOT NULL,
      action text NOT NULL,
      whitelist_id text,
      ip text,
      actor_id text,
      actor_email text,
      before text,
      after text
    );`,
    `CREATE INDEX IF NOT EXISTS api_ip_whitelist_audit_created_at_idx ON api_ip_whitelist_audit (created_at);`,
    `CREATE INDEX IF NOT EXISTS api_ip_whitelist_audit_action_idx ON api_ip_whitelist_audit (action);`,
    `CREATE INDEX IF NOT EXISTS api_ip_whitelist_audit_ip_idx ON api_ip_whitelist_audit (ip);`,
    `CREATE INDEX IF NOT EXISTS api_ip_whitelist_audit_actor_idx ON api_ip_whitelist_audit (actor_email);`,
    `CREATE TABLE IF NOT EXISTS security_switches (
      id text PRIMARY KEY NOT NULL,
      key text NOT NULL,
      enabled integer DEFAULT 1 NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS security_switches_key_unique ON security_switches (key);`,
    `CREATE INDEX IF NOT EXISTS security_switches_enabled_idx ON security_switches (enabled);`,
    `CREATE TABLE IF NOT EXISTS security_switches_audit (
      id text PRIMARY KEY NOT NULL,
      created_at integer NOT NULL,
      action text NOT NULL,
      switch_key text,
      actor_id text,
      actor_email text,
      before text,
      after text
    );`,
    `CREATE INDEX IF NOT EXISTS security_switches_audit_created_at_idx ON security_switches_audit (created_at);`,
    `CREATE INDEX IF NOT EXISTS security_switches_audit_action_idx ON security_switches_audit (action);`,
    `CREATE INDEX IF NOT EXISTS security_switches_audit_switch_key_idx ON security_switches_audit (switch_key);`,
    `CREATE INDEX IF NOT EXISTS security_switches_audit_actor_idx ON security_switches_audit (actor_email);`,
    `CREATE TABLE IF NOT EXISTS api_usage_daily (
      id text PRIMARY KEY NOT NULL,
      day text NOT NULL,
      subject text,
      key_id text,
      domain text NOT NULL,
      ip text,
      count integer DEFAULT 0 NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (key_id) REFERENCES api_keys(id) ON UPDATE no action ON DELETE set null
    );`,
    `CREATE INDEX IF NOT EXISTS api_usage_daily_day_idx ON api_usage_daily (day);`,
    `CREATE INDEX IF NOT EXISTS api_usage_daily_subject_idx ON api_usage_daily (subject);`,
    `CREATE INDEX IF NOT EXISTS api_usage_daily_key_idx ON api_usage_daily (key_id);`,
    `CREATE INDEX IF NOT EXISTS api_usage_daily_domain_idx ON api_usage_daily (domain);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS api_usage_daily_subject_day_domain_ip_unique ON api_usage_daily (subject, day, domain, ip);`,
    `CREATE TABLE IF NOT EXISTS api_usage_window (
      id text PRIMARY KEY NOT NULL,
      window text NOT NULL,
      subject text NOT NULL,
      domain text NOT NULL,
      count integer DEFAULT 0 NOT NULL,
      updated_at integer NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS api_usage_window_window_idx ON api_usage_window (window);`,
    `CREATE INDEX IF NOT EXISTS api_usage_window_subject_idx ON api_usage_window (subject);`,
    `CREATE INDEX IF NOT EXISTS api_usage_window_domain_idx ON api_usage_window (domain);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS api_usage_window_subject_window_domain_unique ON api_usage_window (subject, window, domain);`,
  ];

  for (const sql of statements) {
    await executeWithRetry(sql);
  }

  const usageColumns = await executeWithRetry(`PRAGMA table_info(api_usage_daily);`);
  const hasSubject = usageColumns.rows.some((r) => r.name === 'subject');
  if (!hasSubject) {
    await executeWithRetry(`ALTER TABLE api_usage_daily ADD COLUMN subject text;`);
    await executeWithRetry(
      `UPDATE api_usage_daily SET subject = COALESCE(key_id, 'anon') WHERE subject IS NULL;`
    );
    await executeWithRetry(
      `CREATE INDEX IF NOT EXISTS api_usage_daily_subject_idx ON api_usage_daily (subject);`
    );
    await executeWithRetry(
      `CREATE UNIQUE INDEX IF NOT EXISTS api_usage_daily_subject_day_domain_ip_unique ON api_usage_daily (subject, day, domain, ip);`
    );
  }

  const existingPlans = await executeWithRetry(`SELECT id FROM api_plans LIMIT 1;`);
  if (!existingPlans.rows.length) {
    const now = Date.now();
    await executeWithRetry({
      sql: `INSERT INTO api_plans (id, name, slug, daily_quota, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      args: [crypto.randomUUID(), '免费', 'free', 1000, 1, now, now],
    });
    await executeWithRetry({
      sql: `INSERT INTO api_plans (id, name, slug, daily_quota, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      args: [crypto.randomUUID(), '基础', 'basic', 3000, 1, now, now],
    });
    await executeWithRetry({
      sql: `INSERT INTO api_plans (id, name, slug, daily_quota, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      args: [crypto.randomUUID(), '专业', 'pro', 10000, 1, now, now],
    });
  }
};

// 初始化数据库连接
const initDatabase = () => {
  const dbUrl = getDatabasePath();

  // 确保目录存在
  ensureDbDirectory(dbUrl);

  logger.info('[Database] Initializing database connection', { dbUrl });

  // 创建 libSQL 客户端，启用 WAL 模式以提高并发性能
  const client = createClient({
    url: dbUrl,
  });

  // 创建 Drizzle 实例
  const db = drizzle(client, { schema });

  // 启用 WAL 模式和其他性能优化
  try {
    client.execute('PRAGMA journal_mode = WAL;');
    client.execute('PRAGMA synchronous = NORMAL;');
    client.execute('PRAGMA cache_size = -64000;'); // 64MB cache
    client.execute('PRAGMA temp_store = MEMORY;');
    client.execute('PRAGMA mmap_size = 30000000000;'); // 30GB mmap
    logger.info('[Database] Performance optimizations applied');
  } catch (error) {
    logger.warn('[Database] Could not apply all performance optimizations', { error });
  }

  bootstrapCoreTables(client).catch((error) => {
    logger.error('[Database] Could not bootstrap core tables', { error });
  });
  bootstrapApiTables(client).catch((error) => {
    logger.error('[Database] Could not bootstrap API tables', { error });
  });

  return { db, client };
};

// 导出数据库实例
const { db, client } = initDatabase();

export * from './schema';
export { client, db };
