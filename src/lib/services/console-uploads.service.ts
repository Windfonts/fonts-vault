import { createHash, createHmac, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { ossConfigured, ossPutObject } from '@/lib/oss-put';
import { tryCompressToWoff2 } from '@/lib/upload-woff2';
import { trySplitFontToDir } from '@/lib/upload-split';

const MAX_UPLOADS = 100;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_PROOF_BYTES = 15 * 1024 * 1024;
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

const fileMetaSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().nonnegative().max(MAX_FILE_BYTES),
  contentType: z.string().max(120).optional(),
  weight: z.string().min(1).max(40).default('Regular'),
});

const proofSchema = z
  .object({
    filename: z.string().min(1).max(255),
    size: z.number().int().nonnegative().max(MAX_PROOF_BYTES),
    contentType: z.string().max(120).optional(),
  })
  .nullable()
  .optional();

const initSchema = z.object({
  name: z.string().min(1).max(120),
  family: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  license: z.enum(['own', 'bought', 'ofl', 'apache', 'other']).or(z.string().min(1).max(40)),
  licenseUrl: z.string().max(500).optional().default(''),
  files: z.array(fileMetaSchema).min(1).max(20),
  proof: proofSchema,
  projectId: z.string().max(64).optional().default(''),
  glyphCount: z.number().int().nonnegative().optional().default(0),
});

export type UploadStatus = 'pending_upload' | 'processing' | 'ready' | 'rejected';

export type ConsoleUploadRecord = {
  id: string;
  name: string;
  family: string;
  weights: string[];
  glyphCount: number;
  format: string;
  size: number;
  license: string;
  licenseUrl: string;
  proofName: string;
  proofType: string;
  proofSize: number;
  uploadedAt: string;
  status: UploadStatus;
  review: { state: string; note: string; reviewedAt: string | null };
  projectId: string;
  files: Array<{
    filename: string;
    size: number;
    contentType: string;
    weight: string;
    received: boolean;
    storedAs?: string;
    /** WOFF2 衍生物文件名（与 storedAs 同目录） */
    woff2As?: string;
    /** 相对 blob 目录的切包目录，如 split/Regular（内含 result.css + N.woff2） */
    splitAs?: string;
    /** 切包分片数 */
    splitShards?: number;
    ossKey?: string;
  }>;
  proofReceived: boolean;
  proofOssKey?: string;
  ossPrefix?: string;
  uploadToken: string;
  tokenExpiresAt: number;
};

export type AdminUploadRow = {
  id: string;
  name: string;
  family: string;
  weights: string[];
  glyphCount: number;
  format: string;
  size: number;
  license: string;
  licenseUrl: string;
  proofName: string;
  proofType: string;
  proofSize: number;
  uploadedAt: string;
  status: UploadStatus;
  review: { state: string; note: string; reviewedAt: string | null };
  projectId: string;
  files: Array<{
    filename: string;
    size: number;
    contentType: string;
    weight: string;
    received: boolean;
    ossKey: string;
    woff2As: string;
    splitAs: string;
    splitShards: number;
  }>;
  proofReceived: boolean;
  proofOssKey: string;
  ossPrefix: string;
  ownerKeyHash: string;
};

const reviewBodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(500).optional(),
});

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  uploads: ConsoleUploadRecord[];
};

function keyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

function tokenSecret(): string {
  return (
    process.env.UPLOAD_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    'windfonts-upload-dev-secret'
  );
}

function mintToken(uploadId: string, ownerHash: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${uploadId}.${ownerHash}.${exp}`;
  const sig = createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUploadToken(
  token: string,
  uploadId: string,
  ownerHash: string
): boolean {
  const parts = String(token || '').split('.');
  if (parts.length !== 4) return false;
  const [id, hash, expStr, sig] = parts;
  if (id !== uploadId || hash !== ownerHash) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${id}.${hash}.${expStr}`;
  const expect = createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return sig === expect;
}

function newId(): string {
  return 'up-' + randomBytes(8).toString('hex');
}

function safeWeight(w: string): string {
  return String(w || 'Regular')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .slice(0, 40) || 'Regular';
}

const WEIGHT_CSS: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

export function cssWeightNumber(raw: string): number {
  const s = String(raw || '').trim();
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 1000) return Math.round(asNum);
  const key = s.toLowerCase().replace(/[\s_-]+/g, '');
  return WEIGHT_CSS[key] || 400;
}

export function fontFaceFormat(filename: string, contentType?: string): string {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const ct = String(contentType || '').toLowerCase();
  if (ext === 'woff2' || ct.includes('woff2')) return 'woff2';
  if (ext === 'woff' || ct.includes('woff')) return 'woff';
  if (ext === 'otf' || ct.includes('opentype')) return 'opentype';
  if (ext === 'ttf' || ct.includes('truetype') || ct.includes('ttf')) return 'truetype';
  return 'truetype';
}

function weightKey(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/** Match slot by weight name or CSS number (Regular ↔ regular ↔ 400). */
export function matchUploadWeightSlot<T extends { weight: string }>(
  files: T[],
  want: string
): T | undefined {
  const wantSafe = safeWeight(want);
  const exact = files.find((f) => f.weight === wantSafe || f.weight === want);
  if (exact) return exact;
  const wantKey = weightKey(want);
  const wantNum = cssWeightNumber(want);
  return files.find((f) => {
    if (weightKey(f.weight) === wantKey) return true;
    return cssWeightNumber(f.weight) === wantNum;
  });
}

export class ConsoleUploadsService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'console-uploads');
  }

  private metaPath(hash: string): string {
    return path.join(this.rootDir(), `${hash}.json`);
  }

  private blobDir(uploadId: string): string {
    return path.join(this.rootDir(), 'blobs', uploadId);
  }

  ownerHash(apiKeyRaw: string): string {
    return keyHash(apiKeyRaw);
  }

  private readStore(hash: string): StoreFile {
    const file = this.metaPath(hash);
    if (!fs.existsSync(file)) {
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), uploads: [] };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
      return {
        ownerKeyHash: hash,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        uploads: Array.isArray(raw.uploads) ? raw.uploads : [],
      };
    } catch (error) {
      logger.error('[ConsoleUploadsService] store corrupt', { hash, error });
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), uploads: [] };
    }
  }

  private writeStore(store: StoreFile): void {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.metaPath(store.ownerKeyHash), JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  private publicRow(u: ConsoleUploadRecord) {
    const { uploadToken: _t, tokenExpiresAt: _e, files, proofReceived, ...rest } = u;
    return {
      ...rest,
      files: files.map(({ received, filename, size, contentType, weight, ossKey, woff2As, splitAs, splitShards }) => ({
        filename,
        size,
        contentType,
        weight,
        received,
        ossKey: ossKey || '',
        woff2As: woff2As || '',
        splitAs: splitAs || '',
        splitShards: splitShards || 0,
      })),
      proofReceived,
      proofOssKey: u.proofOssKey || '',
      ossPrefix: u.ossPrefix || '',
    };
  }

  list(apiKeyRaw: string) {
    return this.readStore(this.ownerHash(apiKeyRaw)).uploads.map((u) => this.publicRow(u));
  }

  /** Admin: list across all owner stores. filter=queued → processing + review.queued */
  listAll(filter?: { status?: 'queued' | 'ready' | 'rejected' | 'pending_upload' | 'processing' }) {
    const dir = this.rootDir();
    const out: AdminUploadRow[] = [];
    if (!fs.existsSync(dir)) return out;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      const hash = name.slice(0, -5);
      const store = this.readStore(hash);
      for (const u of store.uploads) {
        const row = { ...this.publicRow(u), ownerKeyHash: hash };
        if (!filter?.status) {
          out.push(row);
          continue;
        }
        if (filter.status === 'queued') {
          if (u.status === 'processing' && (u.review?.state === 'queued' || !u.review?.reviewedAt)) {
            out.push(row);
          }
          continue;
        }
        if (u.status === filter.status) out.push(row);
      }
    }
    out.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
    return out;
  }

  get(apiKeyRaw: string, id: string) {
    const u = this.readStore(this.ownerHash(apiKeyRaw)).uploads.find((x) => x.id === id);
    if (!u) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    return this.publicRow(u);
  }

  init(apiKeyRaw: string, body: unknown, publicBase: string) {
    const parsed = initSchema.parse(body);
    const license = String(parsed.license);
    if ((license === 'own' || license === 'bought') && !parsed.proof) {
      throw Object.assign(new Error('请附上授权证明'), { status: 422, code: 'validation_error' });
    }
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    if (store.uploads.length >= MAX_UPLOADS) {
      throw Object.assign(new Error(`上传队列最多 ${MAX_UPLOADS} 款`), {
        status: 422,
        code: 'quota_exceeded',
      });
    }

    const id = newId();
    const token = mintToken(id, hash);
    const weights: string[] = [];
    const formats: string[] = [];
    let size = 0;
    const files = parsed.files.map((f) => {
      const w = safeWeight(f.weight);
      if (!weights.includes(w)) weights.push(w);
      const ext = String(f.filename).split('.').pop()?.toLowerCase() || '';
      if (ext && !formats.includes(ext)) formats.push(ext);
      size += f.size;
      return {
        filename: f.filename,
        size: f.size,
        contentType: f.contentType || 'application/octet-stream',
        weight: w,
        received: false,
      };
    });

    const record: ConsoleUploadRecord = {
      id,
      name: parsed.name.trim(),
      family: parsed.family,
      weights,
      glyphCount: parsed.glyphCount || 0,
      format: formats.join('+') || 'ttf',
      size,
      license,
      licenseUrl: parsed.licenseUrl || '',
      proofName: parsed.proof?.filename || '',
      proofType: parsed.proof?.contentType || '',
      proofSize: parsed.proof?.size || 0,
      uploadedAt: new Date().toISOString(),
      status: 'pending_upload',
      review: { state: 'queued', note: '', reviewedAt: null },
      projectId: parsed.projectId || '',
      files,
      proofReceived: false,
      uploadToken: token,
      tokenExpiresAt: Date.now() + TOKEN_TTL_MS,
    };

    store.uploads.unshift(record);
    this.writeStore(store);

    const base = publicBase.replace(/\/$/, '');
    const headers = { 'X-Upload-Token': token };
    return {
      id,
      status: record.status as UploadStatus,
      uploadUrls: files.map((f) => ({
        weight: f.weight,
        url: `${base}/api/uploads/${encodeURIComponent(id)}/files/${encodeURIComponent(f.weight)}`,
        headers,
      })),
      proofUrl: parsed.proof
        ? `${base}/api/uploads/${encodeURIComponent(id)}/files/proof`
        : null,
      proofHeaders: parsed.proof ? headers : null,
    };
  }

  /** Resolve owner hash + record by id across stores (token-gated PUT). */
  findById(uploadId: string): { hash: string; store: StoreFile; record: ConsoleUploadRecord } | null {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) return null;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      const hash = name.slice(0, -5);
      const store = this.readStore(hash);
      const record = store.uploads.find((u) => u.id === uploadId);
      if (record) return { hash, store, record };
    }
    return null;
  }

  putFile(opts: {
    uploadId: string;
    part: string;
    token: string;
    bytes: Buffer;
    contentType?: string;
  }) {
    const found = this.findById(opts.uploadId);
    if (!found) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    const { hash, store, record } = found;
    if (!verifyUploadToken(opts.token, opts.uploadId, hash)) {
      throw Object.assign(new Error('上传令牌无效或已过期'), { status: 401, code: 'unauthorized' });
    }
    if (record.status !== 'pending_upload' && record.status !== 'processing') {
      throw Object.assign(new Error('当前状态不可再传文件'), { status: 422, code: 'validation_error' });
    }

    const dir = this.blobDir(opts.uploadId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (opts.part === 'proof') {
      if (opts.bytes.length > MAX_PROOF_BYTES) {
        throw Object.assign(new Error('证明文件过大'), { status: 422, code: 'validation_error' });
      }
      const storedAs = 'proof.bin';
      fs.writeFileSync(path.join(dir, storedAs), opts.bytes);
      record.proofReceived = true;
      record.proofSize = opts.bytes.length;
      if (opts.contentType) record.proofType = opts.contentType;
    } else {
      const weight = safeWeight(decodeURIComponent(opts.part));
      const slot = record.files.find((f) => f.weight === weight);
      if (!slot) {
        throw Object.assign(new Error('未知字重槽位'), { status: 404, code: 'not_found' });
      }
      if (opts.bytes.length > MAX_FILE_BYTES) {
        throw Object.assign(new Error('字体文件过大'), { status: 422, code: 'validation_error' });
      }
      const ext = (slot.filename.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      const storedAs = `${weight}.${ext}`;
      fs.writeFileSync(path.join(dir, storedAs), opts.bytes);
      slot.received = true;
      slot.storedAs = storedAs;
      slot.size = opts.bytes.length;
    }

    this.writeStore(store);
    return { ok: true as const, bytes: opts.bytes.length };
  }

  complete(apiKeyRaw: string, id: string) {
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    const record = store.uploads.find((u) => u.id === id);
    if (!record) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    if (record.status === 'ready') return { id, status: 'ready' as UploadStatus };
    if (record.status !== 'pending_upload' && record.status !== 'processing') {
      throw Object.assign(new Error('当前状态无法 complete'), { status: 422, code: 'validation_error' });
    }
    const missing = record.files.filter((f) => !f.received);
    if (missing.length) {
      throw Object.assign(new Error(`还有 ${missing.length} 个字重未上传`), {
        status: 422,
        code: 'validation_error',
      });
    }
    if ((record.license === 'own' || record.license === 'bought') && !record.proofReceived) {
      throw Object.assign(new Error('授权证明未上传'), { status: 422, code: 'validation_error' });
    }

    record.status = 'processing';
    record.review = { state: 'queued', note: '待运营审核；通过后推 OSS', reviewedAt: null };
    this.writeStore(store);

    return { id, status: 'processing' as UploadStatus };
  }

  /**
   * Admin review. approved → push blobs to OSS (if configured) then ready;
   * rejected → rejected. Does not delete local blobs on reject (operator may re-check).
   */
  async review(
    id: string,
    body: unknown,
    actor?: { email?: string | null }
  ): Promise<{ upload: AdminUploadRow; ossPushed: boolean }> {
    const parsed = reviewBodySchema.parse(body);
    const found = this.findById(id);
    if (!found) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    const { hash, store, record } = found;
    if (record.status === 'pending_upload') {
      throw Object.assign(new Error('文件尚未传完'), { status: 422, code: 'validation_error' });
    }
    if (record.status === 'ready' && parsed.status === 'approved') {
      return { upload: { ...this.publicRow(record), ownerKeyHash: hash }, ossPushed: !!record.ossPrefix };
    }
    if (record.status === 'rejected' && parsed.status === 'rejected') {
      return { upload: { ...this.publicRow(record), ownerKeyHash: hash }, ossPushed: false };
    }

    const note = (parsed.reviewNote || '').trim();
    const who = (actor?.email || '').trim();

    if (parsed.status === 'rejected') {
      record.status = 'rejected';
      record.review = {
        state: 'rejected',
        note: note || (who ? `已拒绝（${who}）` : '已拒绝'),
        reviewedAt: new Date().toISOString(),
      };
      this.writeStore(store);
      return { upload: { ...this.publicRow(record), ownerKeyHash: hash }, ossPushed: false };
    }

    // approved — 先转 WOFF2，再推 OSS（含 woff2）
    let ossPushed = false;
    let woff2Count = 0;
    const prefix = `console-uploads/${id}`;
    const dir = this.blobDir(id);

    for (const slot of record.files) {
      if (!slot.received || !slot.storedAs) continue;
      const local = path.join(dir, slot.storedAs);
      if (!fs.existsSync(local)) {
        throw Object.assign(new Error(`缺少字重文件 ${slot.weight}`), {
          status: 422,
          code: 'validation_error',
        });
      }
      const alreadyWoff2 =
        /\.woff2$/i.test(slot.storedAs) ||
        String(slot.contentType || '').toLowerCase().includes('woff2');
      if (alreadyWoff2) {
        slot.woff2As = slot.storedAs;
        woff2Count += 1;
        continue;
      }
      if (process.env.UPLOAD_WOFF2_SKIP === '1' || process.env.UPLOAD_WOFF2_SKIP === 'true') {
        continue;
      }
      const compressed = await tryCompressToWoff2(
        fs.readFileSync(local),
        `${id}/${slot.weight}`
      );
      if (!compressed) continue;
      const woff2Name = `${safeWeight(slot.weight)}.woff2`;
      fs.writeFileSync(path.join(dir, woff2Name), compressed);
      slot.woff2As = woff2Name;
      woff2Count += 1;
    }

    // cn-font-split：用原 TTF/OTF 切 unicode-range 分片（失败则保留整包 woff2）
    let splitCount = 0;
    let splitShardsTotal = 0;
    if (!(process.env.UPLOAD_SPLIT_SKIP === '1' || process.env.UPLOAD_SPLIT_SKIP === 'true')) {
      for (const slot of record.files) {
        if (!slot.received || !slot.storedAs) continue;
        const local = path.join(dir, slot.storedAs);
        if (!fs.existsSync(local)) continue;
        const ext = path.extname(slot.storedAs).toLowerCase();
        if (!['.ttf', '.otf', '.ttc'].includes(ext) && !/truetype|opentype/i.test(slot.contentType || '')) {
          // 已是整包 woff2 上传：跳过切包（cn-font-split 要源字形）
          if (/\.woff2?$/i.test(ext) || /woff/i.test(slot.contentType || '')) continue;
        }
        const weightSafe = safeWeight(slot.weight);
        const splitRel = `split/${weightSafe}`;
        const splitDir = path.join(dir, splitRel);
        const result = await trySplitFontToDir(fs.readFileSync(local), splitDir, {
          family: record.family,
          weightCss: cssWeightNumber(slot.weight),
          label: `${id}/${slot.weight}`,
        });
        if (!result) continue;
        slot.splitAs = splitRel;
        slot.splitShards = result.shardCount;
        splitCount += 1;
        splitShardsTotal += result.shardCount;
      }
    }

    if (ossConfigured()) {
      for (const slot of record.files) {
        if (!slot.received || !slot.storedAs) continue;
        const originals = [slot.storedAs, slot.woff2As].filter(
          (n, i, arr): n is string => !!n && arr.indexOf(n) === i
        );
        for (const name of originals) {
          const local = path.join(dir, name);
          if (!fs.existsSync(local)) continue;
          const objectKey = `${prefix}/${name}`;
          const ct = name.endsWith('.woff2')
            ? 'font/woff2'
            : slot.contentType || 'application/octet-stream';
          const put = await ossPutObject({
            objectKey,
            body: fs.readFileSync(local),
            contentType: ct,
          });
          if (put) {
            if (name === slot.storedAs) slot.ossKey = put.objectKey;
            ossPushed = true;
          }
        }
        if (slot.splitAs) {
          const splitDir = path.join(dir, slot.splitAs);
          if (fs.existsSync(splitDir)) {
            for (const name of fs.readdirSync(splitDir)) {
              const local = path.join(splitDir, name);
              if (!fs.statSync(local).isFile()) continue;
              const objectKey = `${prefix}/${slot.splitAs}/${name}`;
              const ct = name.endsWith('.woff2')
                ? 'font/woff2'
                : name.endsWith('.css')
                  ? 'text/css; charset=utf-8'
                  : 'application/octet-stream';
              const put = await ossPutObject({
                objectKey,
                body: fs.readFileSync(local),
                contentType: ct,
              });
              if (put) ossPushed = true;
            }
          }
        }
      }
      if (record.proofReceived) {
        const local = path.join(dir, 'proof.bin');
        if (fs.existsSync(local)) {
          const objectKey = `${prefix}/proof.bin`;
          const put = await ossPutObject({
            objectKey,
            body: fs.readFileSync(local),
            contentType: record.proofType || 'application/octet-stream',
          });
          if (put) {
            record.proofOssKey = put.objectKey;
            ossPushed = true;
          }
        }
      }
      if (ossPushed) record.ossPrefix = prefix;
    }

    const bits: string[] = [];
    if (woff2Count) bits.push(`WOFF2×${woff2Count}`);
    if (splitCount) bits.push(`切包×${splitCount}(${splitShardsTotal}片)`);
    if (ossPushed) bits.push(`OSS ${prefix}`);
    if (!bits.length) bits.push('本地落盘');

    record.status = 'ready';
    record.review = {
      state: 'approved',
      note: note || `已通过（${bits.join(' · ')}）${who ? `（${who}）` : ''}`,
      reviewedAt: new Date().toISOString(),
    };
    this.writeStore(store);
    logger.info('[ConsoleUploadsService] review approved', {
      id,
      ossPushed,
      woff2Count,
      splitCount,
      splitShardsTotal,
      actor: who || null,
    });
    return { upload: { ...this.publicRow(record), ownerKeyHash: hash }, ossPushed };
  }

  /** Admin / project CSS: read a local blob part (weight name or "proof"). Prefer WOFF2. */
  readBlob(
    id: string,
    part: string,
    opts?: { preferWoff2?: boolean }
  ): { bytes: Buffer; contentType: string; filename: string; weight: string } {
    const found = this.findById(id);
    if (!found) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    const { record } = found;
    const dir = this.blobDir(id);
    if (part === 'proof') {
      const p = path.join(dir, 'proof.bin');
      if (!fs.existsSync(p)) {
        throw Object.assign(new Error('无授权证明'), { status: 404, code: 'not_found' });
      }
      return {
        bytes: fs.readFileSync(p),
        contentType: record.proofType || 'application/octet-stream',
        filename: record.proofName || 'proof.bin',
        weight: 'proof',
      };
    }
    const slot = matchUploadWeightSlot(record.files, part);
    if (!slot?.storedAs) {
      throw Object.assign(new Error('字重文件不存在'), { status: 404, code: 'not_found' });
    }
    const prefer = opts?.preferWoff2 !== false;
    const woff2Path = slot.woff2As ? path.join(dir, slot.woff2As) : '';
    if (prefer && woff2Path && fs.existsSync(woff2Path)) {
      return {
        bytes: fs.readFileSync(woff2Path),
        contentType: 'font/woff2',
        filename: slot.woff2As!.replace(/\.woff2$/i, '') + '.woff2',
        weight: slot.weight,
      };
    }
    const p = path.join(dir, slot.storedAs);
    if (!fs.existsSync(p)) {
      throw Object.assign(new Error('字重文件不存在'), { status: 404, code: 'not_found' });
    }
    return {
      bytes: fs.readFileSync(p),
      contentType: slot.contentType || 'application/octet-stream',
      filename: slot.filename,
      weight: slot.weight,
    };
  }

  /** Ready-only blob for project CSS delivery. */
  readReadyBlob(id: string, part: string) {
    const found = this.findById(id);
    if (!found) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    if (found.record.status !== 'ready') {
      throw Object.assign(new Error('字体尚未通过审核'), { status: 403, code: 'not_ready' });
    }
    return { ...this.readBlob(id, part), record: found.record, ownerKeyHash: found.hash };
  }



  /** Absolute path to result.css for a weight, or null. */
  readSplitCssPath(id: string, weight: string): string | null {
    const found = this.findById(id);
    if (!found || found.record.status !== 'ready') return null;
    const slot = matchUploadWeightSlot(found.record.files, weight);
    if (!slot?.splitAs) return null;
    const p = path.join(this.blobDir(id), slot.splitAs, 'result.css');
    return fs.existsSync(p) ? p : null;
  }

  /** Serve a cn-font-split shard (N.woff2 / result.css) for a ready upload weight. */
  readSplitShard(
    id: string,
    weight: string,
    file: string
  ): { bytes: Buffer; contentType: string; filename: string; weight: string } {
    const found = this.findById(id);
    if (!found) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    if (found.record.status !== 'ready') {
      throw Object.assign(new Error('字体尚未通过审核'), { status: 403, code: 'not_ready' });
    }
    const slot = matchUploadWeightSlot(found.record.files, weight);
    if (!slot?.splitAs) {
      throw Object.assign(new Error('该字重无切包分片'), { status: 404, code: 'not_found' });
    }
    const base = path.basename(String(file || ''));
    if (!base || base !== file || base.includes('..') || /[\\\/]/.test(file)) {
      throw Object.assign(new Error('非法分片名'), { status: 400, code: 'validation_error' });
    }
    if (!/^(\d+\.(woff2|woff|ttf|otf)|result\.css)$/i.test(base)) {
      throw Object.assign(new Error('非法分片名'), { status: 400, code: 'validation_error' });
    }
    const p = path.join(this.blobDir(id), slot.splitAs, base);
    if (!fs.existsSync(p)) {
      throw Object.assign(new Error('分片不存在'), { status: 404, code: 'not_found' });
    }
    const ct = /\.css$/i.test(base)
      ? 'text/css; charset=utf-8'
      : /\.woff2$/i.test(base)
        ? 'font/woff2'
        : /\.woff$/i.test(base)
          ? 'font/woff'
          : 'application/octet-stream';
    return {
      bytes: fs.readFileSync(p),
      contentType: ct,
      filename: base,
      weight: slot.weight,
    };
  }

  /** Ready record for bakeCss (throws if missing / not ready). */
  requireReady(id: string) {
    const found = this.findById(id);
    if (!found) {
      throw Object.assign(new Error(`上传 ${id} 不存在`), { status: 404, code: 'not_found' });
    }
    if (found.record.status !== 'ready') {
      throw Object.assign(new Error(`上传 ${id} 尚未通过审核（${found.record.status}）`), {
        status: 422,
        code: 'not_ready',
      });
    }
    return found.record;
  }

  remove(apiKeyRaw: string, id: string) {
    const hash = this.ownerHash(apiKeyRaw);
    const store = this.readStore(hash);
    const before = store.uploads.length;
    store.uploads = store.uploads.filter((u) => u.id !== id);
    if (store.uploads.length === before) {
      throw Object.assign(new Error('上传不存在'), { status: 404, code: 'not_found' });
    }
    this.writeStore(store);
    const blob = this.blobDir(id);
    if (fs.existsSync(blob)) {
      fs.rmSync(blob, { recursive: true, force: true });
    }
    return { ok: true as const };
  }
}

export const consoleUploadsService = new ConsoleUploadsService();
