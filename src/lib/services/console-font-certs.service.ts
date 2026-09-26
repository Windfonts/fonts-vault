import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const MAX_CERTS_PER_OWNER = 40;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

const certSchema = z.object({
  id: z.string().min(1).max(64),
  fontKey: z.string().min(1).max(80),
  family: z.string().max(120).optional().default(''),
  normalized: z.string().max(80).optional().default(''),
  name: z.string().max(200).optional().default(''),
  fileName: z.string().max(255).optional().default(''),
  fileSize: z.number().int().nonnegative().optional().default(0),
  mime: z.string().max(120).optional().default(''),
  /** relative under blobs/{id}/ */
  storedAs: z.string().max(120).optional().default(''),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  reason: z.string().max(500).optional().default(''),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
  reviewNote: z.string().max(500).optional().default(''),
});

export type ConsoleFontCert = z.infer<typeof certSchema>;
export type FontCertWithOwner = ConsoleFontCert & { ownerKeyHash: string };

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  certs: ConsoleFontCert[];
};

const createBodySchema = z.object({
  fontKey: z.string().min(1).max(80),
  family: z.string().max(120).optional(),
  normalized: z.string().max(80).optional(),
  name: z.string().max(200).optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().nonnegative().max(MAX_FILE_BYTES).optional(),
  mime: z.string().max(120).optional(),
});

const reviewBodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(500).optional(),
  reason: z.string().max(500).optional(),
});

function keyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

function newId(): string {
  return 'fc_' + randomBytes(8).toString('hex');
}

function normFontKey(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^wenfeng-/, '')
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 80);
}

function normalizeCerts(raw: unknown): ConsoleFontCert[] {
  if (!Array.isArray(raw)) return [];
  const out: ConsoleFontCert[] = [];
  for (const row of raw) {
    try {
      out.push(certSchema.parse(row));
    } catch {
      /* skip */
    }
  }
  return out;
}

export class ConsoleFontCertsService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'console-font-certs');
  }

  private filePath(hash: string): string {
    return path.join(this.rootDir(), `${hash}.json`);
  }

  private blobDir(certId: string): string {
    return path.join(this.rootDir(), 'blobs', certId);
  }

  ownerHash(apiKeyRaw: string): string {
    return keyHash(apiKeyRaw);
  }

  private readStore(hash: string): StoreFile {
    const file = this.filePath(hash);
    if (!fs.existsSync(file)) {
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), certs: [] };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
      return {
        ownerKeyHash: hash,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        certs: normalizeCerts(raw.certs),
      };
    } catch (error) {
      logger.error('[ConsoleFontCertsService] store corrupt', { hash, error });
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), certs: [] };
    }
  }

  private writeStore(store: StoreFile): void {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath(store.ownerKeyHash), JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  private publicRow(c: ConsoleFontCert): ConsoleFontCert {
    return { ...c };
  }

  list(apiKeyRaw: string): ConsoleFontCert[] {
    return this.readStore(this.ownerHash(apiKeyRaw)).certs.map((c) => this.publicRow(c));
  }

  /** Approved fontKeys for this API key (cite unlock). */
  listApprovedKeys(apiKeyRaw: string): string[] {
    const keys = new Set<string>();
    for (const c of this.list(apiKeyRaw)) {
      if (c.status === 'approved' && c.fontKey) keys.add(c.fontKey);
    }
    return [...keys];
  }

  get(apiKeyRaw: string, id: string): ConsoleFontCert {
    const c = this.readStore(this.ownerHash(apiKeyRaw)).certs.find((x) => x.id === id);
    if (!c) {
      throw Object.assign(new Error('证书工单不存在'), { status: 404, code: 'not_found' });
    }
    return this.publicRow(c);
  }

  listAll(filter?: { status?: ConsoleFontCert['status'] }): FontCertWithOwner[] {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) return [];
    const out: FontCertWithOwner[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      const hash = name.replace(/\.json$/, '');
      const store = this.readStore(hash);
      for (const c of store.certs) {
        if (filter?.status && c.status !== filter.status) continue;
        out.push({ ...c, ownerKeyHash: hash });
      }
    }
    out.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
    return out;
  }

  create(apiKeyRaw: string, body: unknown): ConsoleFontCert {
    const parsed = createBodySchema.parse(body);
    const fontKey = normFontKey(parsed.fontKey);
    if (!fontKey) {
      throw Object.assign(new Error('fontKey 无效'), { status: 422, code: 'validation_error' });
    }
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    if (store.certs.length >= MAX_CERTS_PER_OWNER) {
      throw Object.assign(new Error(`每个账户最多 ${MAX_CERTS_PER_OWNER} 条证书工单`), {
        status: 422,
        code: 'validation_error',
      });
    }
    const pendingSame = store.certs.find((c) => c.fontKey === fontKey && c.status === 'pending');
    if (pendingSame) {
      throw Object.assign(new Error('该字体已有审核中的证书'), {
        status: 409,
        code: 'conflict',
      });
    }
    const now = new Date().toISOString();
    const cert: ConsoleFontCert = {
      id: newId(),
      fontKey,
      family: String(parsed.family || '').trim(),
      normalized: String(parsed.normalized || fontKey).trim() || fontKey,
      name: String(parsed.name || fontKey).trim() || fontKey,
      fileName: String(parsed.fileName || '').trim(),
      fileSize: Number(parsed.fileSize) || 0,
      mime: String(parsed.mime || '').trim(),
      storedAs: '',
      status: 'pending',
      reason: '',
      submittedAt: now,
      reviewedAt: null,
      reviewNote: '',
    };
    store.certs.unshift(cert);
    this.writeStore(store);
    return this.publicRow(cert);
  }

  putFile(opts: {
    apiKeyRaw: string;
    id: string;
    bytes: Buffer;
    filename?: string;
    contentType?: string;
  }): ConsoleFontCert {
    const hash = this.ownerHash(opts.apiKeyRaw);
    const store = this.readStore(hash);
    const idx = store.certs.findIndex((c) => c.id === opts.id);
    if (idx < 0) {
      throw Object.assign(new Error('证书工单不存在'), { status: 404, code: 'not_found' });
    }
    const cert = store.certs[idx];
    if (cert.status !== 'pending') {
      throw Object.assign(new Error('仅待审工单可上传文件'), { status: 409, code: 'conflict' });
    }
    if (!opts.bytes?.length) {
      throw Object.assign(new Error('空文件'), { status: 422, code: 'validation_error' });
    }
    if (opts.bytes.length > MAX_FILE_BYTES) {
      throw Object.assign(new Error(`文件超过 ${MAX_FILE_BYTES} 字节`), {
        status: 422,
        code: 'validation_error',
      });
    }
    const mime = String(opts.contentType || '').toLowerCase();
    if (mime && !/^(application\/pdf|image\/(png|jpe?g|webp|gif))$/i.test(mime)) {
      throw Object.assign(new Error('仅支持 PDF / 图片'), { status: 422, code: 'validation_error' });
    }
    const dir = this.blobDir(cert.id);
    fs.mkdirSync(dir, { recursive: true });
    const ext =
      (String(opts.filename || '').split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') ||
      'bin';
    const storedAs = `proof.${ext}`;
    fs.writeFileSync(path.join(dir, storedAs), opts.bytes);
    store.certs[idx] = {
      ...cert,
      storedAs,
      fileName: String(opts.filename || cert.fileName || storedAs).slice(0, 255),
      fileSize: opts.bytes.length,
      mime: mime || cert.mime || '',
    };
    this.writeStore(store);
    return this.publicRow(store.certs[idx]);
  }

  /** Whether this API key has an approved grant for fontKey. */
  hasApprovedGrant(apiKeyRaw: string, fontKeyRaw: string): boolean {
    const want = normFontKey(fontKeyRaw);
    if (!want) return false;
    return this.list(apiKeyRaw).some((c) => c.status === 'approved' && c.fontKey === want);
  }

  /** Admin: read stored proof blob for a cert id. */
  readProofBlob(certId: string): {
    bytes: Buffer;
    contentType: string;
    filename: string;
    cert: FontCertWithOwner;
  } {
    const all = this.listAll();
    const hit = all.find((c) => c.id === certId);
    if (!hit) {
      throw Object.assign(new Error('工单不存在'), { status: 404, code: 'not_found' });
    }
    if (!hit.storedAs) {
      throw Object.assign(new Error('尚未上传证明文件'), { status: 404, code: 'not_found' });
    }
    const p = path.join(this.blobDir(hit.id), hit.storedAs);
    if (!fs.existsSync(p)) {
      throw Object.assign(new Error('证明文件缺失'), { status: 404, code: 'not_found' });
    }
    const ct =
      hit.mime ||
      (/\.pdf$/i.test(hit.storedAs)
        ? 'application/pdf'
        : /\.png$/i.test(hit.storedAs)
          ? 'image/png'
          : /\.jpe?g$/i.test(hit.storedAs)
            ? 'image/jpeg'
            : /\.webp$/i.test(hit.storedAs)
              ? 'image/webp'
              : 'application/octet-stream');
    return {
      bytes: fs.readFileSync(p),
      contentType: ct,
      filename: hit.fileName || hit.storedAs,
      cert: hit,
    };
  }

  review(
    certId: string,
    body: unknown,
    actor?: { email?: string | null }
  ): { cert: FontCertWithOwner } {
    const parsed = reviewBodySchema.parse(body);
    const all = this.listAll();
    const hit = all.find((c) => c.id === certId);
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
    const idx = store.certs.findIndex((c) => c.id === certId);
    if (idx < 0) {
      throw Object.assign(new Error('工单不存在'), { status: 404, code: 'not_found' });
    }
    const now = new Date().toISOString();
    const rejectReason =
      parsed.status === 'rejected'
        ? parsed.reason || parsed.reviewNote || '证书未覆盖网页字体嵌入 / webfont 用途'
        : '';
    store.certs[idx] = {
      ...store.certs[idx],
      status: parsed.status,
      reviewedAt: now,
      reviewNote: parsed.reviewNote || '',
      reason: rejectReason,
    };
    this.writeStore(store);
    const updated: FontCertWithOwner = { ...store.certs[idx], ownerKeyHash: hit.ownerKeyHash };
    logger.info('[ConsoleFontCertsService] reviewed', {
      certId,
      fontKey: updated.fontKey,
      status: updated.status,
      actor: actor?.email || null,
    });
    return { cert: updated };
  }
}

export const consoleFontCertsService = new ConsoleFontCertsService();
