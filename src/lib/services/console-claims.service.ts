import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const MAX_CLAIMS_PER_OWNER = 50;

const claimSchema = z.object({
  id: z.string().min(1).max(64),
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  kind: z.string().max(40).optional().default(''),
  kindLabel: z.string().max(80).optional().default(''),
  website: z.string().max(500).optional().default(''),
  email: z.string().max(200).optional().default(''),
  licenseUrl: z.string().max(500).optional().default(''),
  proofUrl: z.string().max(500).optional().default(''),
  platformNoteUrl: z.string().max(500).optional().default(''),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
  reviewNote: z.string().max(500).optional().default(''),
});

export type ConsoleClaim = z.infer<typeof claimSchema>;

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  claims: ConsoleClaim[];
};

const createBodySchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200).optional(),
  kind: z.string().max(40).optional(),
  kindLabel: z.string().max(80).optional(),
  website: z.string().max(500).optional(),
  email: z.string().max(200).optional(),
  licenseUrl: z.string().max(500).optional(),
  proofUrl: z.string().max(500).optional(),
  platformNoteUrl: z.string().max(500).optional(),
});

function keyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

function newId(): string {
  return 'cl_' + randomBytes(8).toString('hex');
}

function normalizeClaims(raw: unknown): ConsoleClaim[] {
  if (!Array.isArray(raw)) return [];
  const out: ConsoleClaim[] = [];
  for (const row of raw) {
    try {
      out.push(claimSchema.parse(row));
    } catch {
      /* skip */
    }
  }
  return out;
}

export class ConsoleClaimsService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'console-claims');
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
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), claims: [] };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
      return {
        ownerKeyHash: hash,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        claims: normalizeClaims(raw.claims),
      };
    } catch (error) {
      logger.error('[ConsoleClaimsService] store corrupt', { hash, error });
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), claims: [] };
    }
  }

  private writeStore(store: StoreFile): void {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath(store.ownerKeyHash), JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  list(apiKeyRaw: string): ConsoleClaim[] {
    return this.readStore(this.ownerHash(apiKeyRaw)).claims.slice();
  }

  create(apiKeyRaw: string, body: unknown): ConsoleClaim {
    const parsed = createBodySchema.parse(body);
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    if (store.claims.length >= MAX_CLAIMS_PER_OWNER) {
      throw Object.assign(new Error(`每个账户最多 ${MAX_CLAIMS_PER_OWNER} 条认领工单`), {
        status: 422,
        code: 'validation_error',
      });
    }
    const slug = String(parsed.slug).trim();
    const pendingSame = store.claims.find((c) => c.slug === slug && c.status === 'pending');
    if (pendingSame) {
      throw Object.assign(new Error('该厂商已有审核中的认领'), {
        status: 409,
        code: 'conflict',
      });
    }
    const now = new Date().toISOString();
    const claim: ConsoleClaim = {
      id: newId(),
      slug,
      name: String(parsed.name || slug).trim() || slug,
      kind: parsed.kind || '',
      kindLabel: parsed.kindLabel || '',
      website: parsed.website || '',
      email: parsed.email || '',
      licenseUrl: parsed.licenseUrl || '',
      proofUrl: parsed.proofUrl || '',
      platformNoteUrl: parsed.platformNoteUrl || '',
      status: 'pending',
      submittedAt: now,
      reviewedAt: null,
      reviewNote: '',
    };
    store.claims.unshift(claim);
    this.writeStore(store);
    return claim;
  }
}

export const consoleClaimsService = new ConsoleClaimsService();
