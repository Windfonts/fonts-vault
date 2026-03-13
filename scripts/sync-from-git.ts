/**
 * 从 git 仓库同步元数据到 fonts-vault DB
 *
 * 步骤：
 *   1. font-foundries → brands 表（upsert by slug）
 *   2. font-metadata  → fonts 表（upsert by normalized_name，补充字段）
 *
 * 运行方式：
 *   DATABASE_URL=file:./data/prod.db npx tsx scripts/sync-from-git.ts
 *   DATABASE_URL=file:./data/prod.db npx tsx scripts/sync-from-git.ts --brands-only
 *   DATABASE_URL=file:./data/prod.db npx tsx scripts/sync-from-git.ts --fonts-only
 */

import { db } from '../src/lib/db/client';
import { brands, fonts } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const FORGEJO_BASE = process.env.FORGEJO_BASE || 'https://feicode.com';
const FORGEJO_TOKEN = process.env.FORGEJO_TOKEN || '';
const ORG = 'Windfonts';

const args = process.argv.slice(2);
const brandsOnly = args.includes('--brands-only');
const fontsOnly = args.includes('--fonts-only');

// ─── Forgejo API helpers ──────────────────────────────────────────────────────

async function apiGet(path: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (FORGEJO_TOKEN) headers['Authorization'] = `token ${FORGEJO_TOKEN}`;
  const res = await fetch(`${FORGEJO_BASE}/api/v1${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function rawGet(path: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (FORGEJO_TOKEN) headers['Authorization'] = `token ${FORGEJO_TOKEN}`;
  const res = await fetch(`${FORGEJO_BASE}/api/v1${path}`, { headers });
  if (!res.ok) throw new Error(`raw GET ${path} → ${res.status}`);
  return res.text();
}

async function listDir(repo: string, dir: string): Promise<string[]> {
  const items = await apiGet(`/repos/${ORG}/${repo}/contents/${dir}`);
  return (items as Array<{ name: string; type: string }>)
    .filter((i) => i.type === 'dir')
    .map((i) => i.name);
}

async function readJson<T>(repo: string, filePath: string): Promise<T | null> {
  try {
    const text = await rawGet(`/repos/${ORG}/${repo}/raw/${filePath}`);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FoundryProfile {
  slug: string;
  name: string;
  nameEn?: string | null;
  type?: string | null;
  country?: string | null;
  website?: string | null;
  licensePolicyUrl?: string | null;
  contactEmail?: string | null;
  description?: string | null;
  defaultLicenseType?: string | null;
  established?: number | null;
  logoUrl?: string | null;
}

interface FontMeta {
  normalizedName: string;
  family: string;
  familyEn?: string | null;
  fontFamily: string;
  designer?: string | null;
  foundry?: string | null;
  releaseYear?: number | null;
  version?: string | null;
  license?: {
    type?: string | null;
    spdx?: string | null;
    url?: string | null;
    commercial?: boolean;
    attribution?: boolean;
  };
  description?: string | null;
  languages?: string[];
  languagesZh?: string[];
  tags?: string[];
  keywords?: string[];
  useCases?: string[];
}

// ─── Step 1: sync foundries → brands ─────────────────────────────────────────

async function syncFoundries() {
  console.log('\n📦 同步厂商数据 (font-foundries → brands)...');

  const slugs = await listDir('font-foundries', 'foundries');
  console.log(`  发现 ${slugs.length} 个厂商`);

  let added = 0, updated = 0, skipped = 0;

  for (const slug of slugs) {
    const profile = await readJson<FoundryProfile>('font-foundries', `foundries/${slug}/profile.json`);
    if (!profile) { skipped++; continue; }

    const now = new Date();
    const existing = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);

    if (existing.length > 0) {
      // upsert：只更新非空字段，不覆盖已有内容
      const patch: Partial<typeof brands.$inferInsert> = { updatedAt: now };
      if (profile.name) patch.name = profile.name;
      if (profile.website) patch.website = profile.website;
      if (profile.description) patch.description = profile.description;
      if (profile.logoUrl) patch.logoUrl = profile.logoUrl;

      await db.update(brands).set(patch).where(eq(brands.slug, slug));
      updated++;
    } else {
      await db.insert(brands).values({
        id: crypto.randomUUID(),
        name: profile.name || slug,
        slug,
        website: profile.website ?? null,
        description: profile.description ?? null,
        logoUrl: profile.logoUrl ?? null,
        status: 'published',
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }
  }

  console.log(`  ✅ 新增 ${added}，更新 ${updated}，跳过 ${skipped}`);
}

// ─── Step 2: sync font-metadata → fonts ──────────────────────────────────────

async function syncFontMeta() {
  console.log('\n🔤 同步字体元数据 (font-metadata → fonts)...');

  const fontDirs = await listDir('font-metadata', 'fonts');
  console.log(`  发现 ${fontDirs.length} 个字体`);

  let updated = 0, skipped = 0, notFound = 0;

  for (const dir of fontDirs) {
    const meta = await readJson<FontMeta>('font-metadata', `fonts/${dir}/meta.json`);
    if (!meta) { skipped++; continue; }

    const normalizedName = meta.normalizedName || dir;
    const existing = await db.select().from(fonts)
      .where(eq(fonts.normalizedName, normalizedName)).limit(1);

    if (existing.length === 0) { notFound++; continue; }

    // 只补充 font-mapping.json 没有或为空的字段
    const record = existing[0];
    const patch: Partial<typeof fonts.$inferInsert> = { updatedAt: new Date() };

    if (!record.designer && meta.designer) patch.designer = meta.designer;
    if (!record.description && meta.description) patch.description = meta.description;
    if (!record.license && meta.license?.spdx) patch.license = meta.license.spdx;
    if (!record.licenseType && meta.license?.type) patch.licenseType = meta.license.type;
    if (!record.releaseYear && meta.releaseYear) patch.releaseYear = meta.releaseYear;

    // 语言字段：meta.json 用 BCP47（zh-Hans），DB 存中文名
    if ((!record.languages || (record.languages as string[]).length === 0) && meta.languagesZh?.length) {
      patch.languages = meta.languagesZh;
    }

    await db.update(fonts).set(patch).where(eq(fonts.normalizedName, normalizedName));
    updated++;
  }

  console.log(`  ✅ 更新 ${updated}，DB 中未找到 ${notFound}，跳过 ${skipped}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 fonts-vault git 同步脚本');
  console.log(`   仓库: ${FORGEJO_BASE}/${ORG}`);
  console.log(`   DB:   ${process.env.DATABASE_URL || 'file:./data/dev.db'}`);

  if (!fontsOnly) await syncFoundries();
  if (!brandsOnly) await syncFontMeta();

  console.log('\n✅ 同步完成');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 同步失败:', err);
  process.exit(1);
});
