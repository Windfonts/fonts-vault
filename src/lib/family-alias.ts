/**
 * Family alias resolution for deduped / renamed fonts.
 * Reads data/family-aliases.json (mounted at /app/data in production).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type AliasMap = Record<string, string>;

let cached: AliasMap | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

function loadAliases(): AliasMap {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) return cached;

  const candidates = [
    join(process.cwd(), 'data', 'family-aliases.json'),
    '/app/data/family-aliases.json',
  ];

  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const raw = JSON.parse(readFileSync(p, 'utf8')) as { aliases?: AliasMap };
      cached = raw.aliases || {};
      cachedAt = now;
      return cached;
    } catch {
      // try next path
    }
  }

  cached = {};
  cachedAt = now;
  return cached;
}

/**
 * Resolve a request family / normalized token to the keeper family
 * (usually `wenfeng-{short}`). Returns lowercased token; unchanged if no alias.
 */
export function resolveFamilyAlias(token: string): string {
  let e = String(token || '')
    .trim()
    .toLowerCase();
  if (!e) return e;

  const aliases = loadAliases();
  if (aliases[e]) return aliases[e];

  const short = e.replace(/^wenfeng-/, '').replace(/^windfonts-/, '');
  if (aliases[short]) return aliases[short];
  if (aliases[`wenfeng-${short}`]) return aliases[`wenfeng-${short}`];

  return e;
}
