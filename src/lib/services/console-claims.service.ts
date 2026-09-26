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

export type ClaimWithOwner = ConsoleClaim & { ownerKeyHash: string };

export type FoundryClaimStatus = {
  claimed: boolean;
  claimId: string;
  slug: string;
  name: string;
  approvedAt: string;
  email?: string;
};

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  claims: ConsoleClaim[];
};

type StatusFile = {
  updatedAt: string;
  bySlug: Record<string, FoundryClaimStatus>;
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

const reviewBodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(500).optional(),
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

  private statusPath(): string {
    return path.join(process.cwd(), 'data', 'foundry-claim-status.json');
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

  private readStatusFile(): StatusFile {
    const file = this.statusPath();
    if (!fs.existsSync(file)) {
      return { updatedAt: new Date().toISOString(), bySlug: {} };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StatusFile;
      return {
        updatedAt: raw.updatedAt || new Date().toISOString(),
        bySlug: raw.bySlug && typeof raw.bySlug === 'object' ? raw.bySlug : {},
      };
    } catch (error) {
      logger.error('[ConsoleClaimsService] status file corrupt', { error });
      return { updatedAt: new Date().toISOString(), bySlug: {} };
    }
  }

  private writeStatusFile(status: StatusFile): void {
    const dir = path.dirname(this.statusPath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    status.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.statusPath(), JSON.stringify(status, null, 2) + '\n', 'utf8');
  }

  /** 可选：回写前台 foundries.json 的 claimed（FOUNDRIES_JSON_PATH）。 */
  private patchFoundriesJson(slug: string, claimed: boolean): { patched: boolean; path?: string } {
    const file = String(process.env.FOUNDRIES_JSON_PATH || '').trim();
    if (!file || !fs.existsSync(file)) return { patched: false };
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
        foundries?: Array<Record<string, unknown>>;
      };
      const list = Array.isArray(raw.foundries) ? raw.foundries : [];
      let hit = false;
      for (const row of list) {
        const id = String(row.id || '');
        if (id === slug || id.toLowerCase() === slug.toLowerCase()) {
          row.claimed = claimed;
          hit = true;
          break;
        }
      }
      if (!hit) return { patched: false, path: file };
      fs.writeFileSync(file, JSON.stringify(raw, null, 2) + '\n', 'utf8');
      return { patched: true, path: file };
    } catch (error) {
      logger.error('[ConsoleClaimsService] foundries.json patch failed', { file, error });
      return { patched: false, path: file };
    }
  }

  list(apiKeyRaw: string): ConsoleClaim[] {
    return this.readStore(this.ownerHash(apiKeyRaw)).claims.slice();
  }

  listAll(filter?: { status?: ConsoleClaim['status'] }): ClaimWithOwner[] {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) return [];
    const out: ClaimWithOwner[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      const hash = name.replace(/\.json$/, '');
      const store = this.readStore(hash);
      for (const c of store.claims) {
        if (filter?.status && c.status !== filter.status) continue;
        out.push({ ...c, ownerKeyHash: hash });
      }
    }
    out.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
    return out;
  }

  claimStatusMap(): StatusFile {
    return this.readStatusFile();
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

  review(
    claimId: string,
    body: unknown,
    actor?: { email?: string | null }
  ): {
    claim: ClaimWithOwner;
    foundriesPatched: boolean;
  } {
    const parsed = reviewBodySchema.parse(body);
    const all = this.listAll();
    const hit = all.find((c) => c.id === claimId);
    if (!hit) {
      throw Object.assign(new Error('工单不存在'), { status: 404, code: 'not_found' });
    }
    if (hit.status !== 'pending') {
      throw Object.assign(new Error('工单已审核，不能重复处理'), {
        status: 409,
        code: 'conflict',
      });
    }
    const store = this.readStore(hit.ownerKeyHash);
    const idx = store.claims.findIndex((c) => c.id === claimId);
    if (idx < 0) {
      throw Object.assign(new Error('工单不存在'), { status: 404, code: 'not_found' });
    }
    const now = new Date().toISOString();
    const note = parsed.reviewNote || '';
    store.claims[idx] = {
      ...store.claims[idx],
      status: parsed.status,
      reviewedAt: now,
      reviewNote: note,
    };
    this.writeStore(store);

    const updated: ClaimWithOwner = { ...store.claims[idx], ownerKeyHash: hit.ownerKeyHash };
    let foundriesPatched = false;

    if (parsed.status === 'approved') {
      const status = this.readStatusFile();
      status.bySlug[updated.slug] = {
        claimed: true,
        claimId: updated.id,
        slug: updated.slug,
        name: updated.name,
        approvedAt: now,
        email: updated.email || undefined,
      };
      this.writeStatusFile(status);
      foundriesPatched = this.patchFoundriesJson(updated.slug, true).patched;
      logger.info('[ConsoleClaimsService] claim approved', {
        claimId,
        slug: updated.slug,
        actor: actor?.email || null,
        foundriesPatched,
      });
    } else {
      logger.info('[ConsoleClaimsService] claim rejected', {
        claimId,
        slug: updated.slug,
        actor: actor?.email || null,
      });
    }

    return { claim: updated, foundriesPatched };
  }
}

export const consoleClaimsService = new ConsoleClaimsService();
