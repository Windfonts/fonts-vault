import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const MAX_PER_BUCKET = 500;

const favItemSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(200).optional(),
});

export type ConsoleFavItem = z.infer<typeof favItemSchema>;

export type ConsoleFavsPayload = {
  fonts: ConsoleFavItem[];
  authors: ConsoleFavItem[];
  updatedAt: string;
};

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  fonts: ConsoleFavItem[];
  authors: ConsoleFavItem[];
};

function keyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

function normalizeBucket(raw: unknown): ConsoleFavItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ConsoleFavItem[] = [];
  for (const row of raw) {
    if (out.length >= MAX_PER_BUCKET) break;
    try {
      const item = favItemSchema.parse(row);
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({ id: item.id, name: item.name || item.id });
    } catch {
      /* skip */
    }
  }
  return out;
}

export class ConsoleFavsService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'console-favs');
  }

  private filePath(hash: string): string {
    return path.join(this.rootDir(), `${hash}.json`);
  }

  ownerHash(apiKeyRaw: string): string {
    return keyHash(apiKeyRaw);
  }

  private readStore(hash: string): StoreFile {
    const file = this.filePath(hash);
    if (!fs.existsSync(file)) {
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), fonts: [], authors: [] };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
      return {
        ownerKeyHash: hash,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        fonts: normalizeBucket(raw.fonts),
        authors: normalizeBucket(raw.authors),
      };
    } catch (error) {
      logger.error('[ConsoleFavsService] store corrupt', { hash, error });
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), fonts: [], authors: [] };
    }
  }

  private writeStore(store: StoreFile): void {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath(store.ownerKeyHash), JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  get(apiKeyRaw: string): ConsoleFavsPayload {
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    return {
      fonts: store.fonts.slice(),
      authors: store.authors.slice(),
      updatedAt: store.updatedAt,
    };
  }

  put(
    apiKeyRaw: string,
    body: { fonts?: unknown; authors?: unknown }
  ): ConsoleFavsPayload {
    const hash = this.ownerHash(apiKeyRaw);
    if (Array.isArray(body.fonts) && body.fonts.length > MAX_PER_BUCKET) {
      throw Object.assign(new Error(`字体收藏最多 ${MAX_PER_BUCKET} 条`), {
        status: 422,
        code: 'validation_error',
      });
    }
    if (Array.isArray(body.authors) && body.authors.length > MAX_PER_BUCKET) {
      throw Object.assign(new Error(`厂商收藏最多 ${MAX_PER_BUCKET} 条`), {
        status: 422,
        code: 'validation_error',
      });
    }
    const store: StoreFile = {
      ownerKeyHash: hash,
      updatedAt: new Date().toISOString(),
      fonts: normalizeBucket(body.fonts),
      authors: normalizeBucket(body.authors),
    };
    this.writeStore(store);
    return {
      fonts: store.fonts.slice(),
      authors: store.authors.slice(),
      updatedAt: store.updatedAt,
    };
  }
}

export const consoleFavsService = new ConsoleFavsService();
export const CONSOLE_FAVS_MAX = MAX_PER_BUCKET;
