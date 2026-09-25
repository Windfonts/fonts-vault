import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

type SubsetKey = 'en' | 'zh-common' | 'zh' | 'full';

type SizeEntry = {
  weight?: string;
  subsets?: Partial<Record<SubsetKey, { cssBytes: number }>>;
};

type PackageSizesFile = {
  byNormalized?: Record<string, SizeEntry>;
  generatedAt?: string;
};

let cache: PackageSizesFile | null = null;

function load(): PackageSizesFile {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'data', 'package-sizes.json');
  try {
    if (!fs.existsSync(file)) {
      cache = { byNormalized: {} };
      return cache;
    }
    cache = JSON.parse(fs.readFileSync(file, 'utf8')) as PackageSizesFile;
    return cache;
  } catch (error) {
    logger.warn('[PackageSize] load failed', { error });
    cache = { byNormalized: {} };
    return cache;
  }
}

export function getPackageSize(
  keys: string[],
  subset: SubsetKey = 'full'
): { cssBytes: number; weight?: string; subset: SubsetKey; source: string } | null {
  const data = load();
  const map = data.byNormalized || {};
  for (const raw of keys) {
    const k = String(raw || '').trim();
    if (!k) continue;
    const entry = map[k] || map[k.toLowerCase()];
    if (!entry?.subsets) continue;
    const hit =
      entry.subsets[subset] ||
      entry.subsets.full ||
      entry.subsets['zh-common'] ||
      entry.subsets.zh ||
      entry.subsets.en;
    if (hit?.cssBytes) {
      return {
        cssBytes: hit.cssBytes,
        weight: entry.weight,
        subset: (entry.subsets[subset] ? subset : 'full') as SubsetKey,
        source: 'package-sizes.json',
      };
    }
  }
  return null;
}

export function clearPackageSizeCache(): void {
  cache = null;
}
