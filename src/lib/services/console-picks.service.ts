import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const MAX_PICKS = 200;

const pickItemSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(200).optional(),
  family: z.string().max(200).optional(),
  addedAt: z.string().optional(),
});

export type ConsolePickItem = z.infer<typeof pickItemSchema>;

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  items: ConsolePickItem[];
};

function keyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

function normalizeItems(raw: unknown): ConsolePickItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ConsolePickItem[] = [];
  for (const row of raw) {
    if (out.length >= MAX_PICKS) break;
    try {
      const item = pickItemSchema.parse(row);
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({
        id: item.id,
        name: item.name || item.id,
        family: item.family,
        addedAt: item.addedAt || new Date().toISOString(),
      });
    } catch {
      /* skip bad row */
    }
  }
  return out;
}

export class ConsolePicksService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'console-picks');
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
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), items: [] };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
      return {
        ownerKeyHash: hash,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        items: normalizeItems(raw.items),
      };
    } catch (error) {
      logger.error('[ConsolePicksService] store corrupt', { hash, error });
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), items: [] };
    }
  }

  private writeStore(store: StoreFile): void {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath(store.ownerKeyHash), JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  get(apiKeyRaw: string): { items: ConsolePickItem[]; updatedAt: string } {
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    return { items: store.items.slice(), updatedAt: store.updatedAt };
  }

  put(apiKeyRaw: string, items: unknown): { items: ConsolePickItem[]; updatedAt: string } {
    const hash = this.ownerHash(apiKeyRaw);
    const next = normalizeItems(items);
    if (Array.isArray(items) && items.length > MAX_PICKS) {
      throw Object.assign(new Error(`选字袋最多 ${MAX_PICKS} 款`), {
        status: 422,
        code: 'validation_error',
      });
    }
    const store: StoreFile = { ownerKeyHash: hash, updatedAt: new Date().toISOString(), items: next };
    this.writeStore(store);
    return { items: store.items.slice(), updatedAt: store.updatedAt };
  }
}

export const consolePicksService = new ConsolePicksService();
export const CONSOLE_PICKS_MAX = MAX_PICKS;
