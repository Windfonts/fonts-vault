import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const domainSchema = z.object({
  host: z.string().min(1).max(253),
  verified: z.boolean().default(false),
  method: z.enum(['dns', 'file', 'meta']).default('dns'),
  addedAt: z.string().optional(),
  verifiedAt: z.string().nullable().optional(),
  lastSeenAt: z.string().nullable().optional(),
  requests30d: z.number().optional(),
  bytes30d: z.number().optional(),
});

const consoleProjectSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  createdAt: z.string(),
  updatedAt: z.string(),
  fonts: z.array(z.unknown()).default([]),
  domains: z.array(domainSchema).default([]),
  versions: z.array(z.unknown()).default([]),
  delivery: z.record(z.unknown()).optional(),
  usage: z.record(z.unknown()).optional(),
});

export type ConsoleProject = z.infer<typeof consoleProjectSchema>;
export type ConsoleDomain = z.infer<typeof domainSchema>;

type StoreFile = {
  ownerKeyHash: string;
  updatedAt: string;
  projects: ConsoleProject[];
};

function keyHash(raw: string): string {
  return createHash('sha256').update(String(raw || '').trim()).digest('hex');
}

function newId(): string {
  return 'p_' + randomBytes(8).toString('hex');
}

function slugify(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'project';
}

function validHost(host: string): boolean {
  const h = String(host || '').trim().toLowerCase();
  if (!h || h.length > 253) return false;
  if (h === 'localhost' || h === '127.0.0.1') return true;
  return /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(h);
}

export class ConsoleProjectService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'console-projects');
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
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), projects: [] };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
      const projects = Array.isArray(raw.projects)
        ? raw.projects
            .map((p) => {
              try {
                return consoleProjectSchema.parse(p);
              } catch {
                return null;
              }
            })
            .filter(Boolean) as ConsoleProject[]
        : [];
      return { ownerKeyHash: hash, updatedAt: raw.updatedAt || new Date().toISOString(), projects };
    } catch (error) {
      logger.error('[ConsoleProjectService] store corrupt', { hash, error });
      return { ownerKeyHash: hash, updatedAt: new Date().toISOString(), projects: [] };
    }
  }

  private writeStore(store: StoreFile): void {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath(store.ownerKeyHash), JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  list(apiKeyRaw: string, q?: string): ConsoleProject[] {
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    const needle = String(q || '').trim().toLowerCase();
    if (!needle) return store.projects.slice();
    return store.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.id.toLowerCase().includes(needle)
    );
  }

  get(apiKeyRaw: string, id: string): ConsoleProject | null {
    return this.list(apiKeyRaw).find((p) => p.id === id) || null;
  }

  create(apiKeyRaw: string, name: string): ConsoleProject {
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    const now = new Date().toISOString();
    let slug = slugify(name);
    const taken = new Set(store.projects.map((p) => p.slug));
    if (taken.has(slug)) {
      let i = 2;
      while (taken.has(`${slug}-${i}`)) i += 1;
      slug = `${slug}-${i}`;
    }
    const project = consoleProjectSchema.parse({
      id: newId(),
      name: String(name).trim(),
      slug,
      createdAt: now,
      updatedAt: now,
      fonts: [],
      domains: [],
      versions: [],
      delivery: { display: '', preload: false, subset: 'full', cdn: 'cn', structure: 'dynamic', alias: '' },
      usage: {
        requests30d: 0,
        bytes30d: 0,
        topPages: [],
        byDomain: [],
        byFont: [],
        blockedHosts: [],
        status: { '200': 0, '304': 0, '403': 0 },
        perf: { fcpMs: 0, fontLoadMs: 0, hitRate: 0 },
      },
    });
    store.projects.unshift(project);
    this.writeStore(store);
    return project;
  }

  patch(apiKeyRaw: string, id: string, body: Record<string, unknown>): ConsoleProject {
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    const idx = store.projects.findIndex((p) => p.id === id);
    if (idx < 0) throw Object.assign(new Error('项目不存在'), { status: 404, code: 'not_found' });
    const cur = store.projects[idx];
    const next: ConsoleProject = { ...cur };
    if (body.name != null) next.name = String(body.name).trim() || cur.name;
    if (body.slug != null) {
      const slug = slugify(String(body.slug));
      if (!slug) throw Object.assign(new Error('slug 无效'), { status: 422, code: 'validation_error' });
      if (store.projects.some((p) => p.id !== id && p.slug === slug)) {
        throw Object.assign(new Error('slug 已被占用'), { status: 409, code: 'conflict' });
      }
      next.slug = slug;
    }
    if (body.delivery && typeof body.delivery === 'object') {
      next.delivery = { ...(cur.delivery || {}), ...(body.delivery as Record<string, unknown>) };
    }
    if (Array.isArray(body.fonts)) next.fonts = body.fonts;
    if (Array.isArray(body.versions)) next.versions = body.versions;
    if (body.usage && typeof body.usage === 'object') {
      next.usage = { ...(cur.usage || {}), ...(body.usage as Record<string, unknown>) };
    }
    next.updatedAt = new Date().toISOString();
    store.projects[idx] = consoleProjectSchema.parse(next);
    this.writeStore(store);
    return store.projects[idx];
  }

  remove(apiKeyRaw: string, id: string): void {
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    const next = store.projects.filter((p) => p.id !== id);
    if (next.length === store.projects.length) {
      throw Object.assign(new Error('项目不存在'), { status: 404, code: 'not_found' });
    }
    store.projects = next;
    this.writeStore(store);
  }

  listAllDomains(apiKeyRaw: string): Array<ConsoleDomain & { projectId: string; projectName: string }> {
    const out: Array<ConsoleDomain & { projectId: string; projectName: string }> = [];
    for (const p of this.list(apiKeyRaw)) {
      for (const d of p.domains || []) {
        out.push({ ...d, projectId: p.id, projectName: p.name });
      }
    }
    return out;
  }

  listDomains(apiKeyRaw: string, projectId: string): ConsoleDomain[] {
    const p = this.get(apiKeyRaw, projectId);
    if (!p) throw Object.assign(new Error('项目不存在'), { status: 404, code: 'not_found' });
    return (p.domains || []).slice();
  }

  addDomain(apiKeyRaw: string, projectId: string, host: string, method: string): ConsoleDomain {
    const h = String(host || '').trim().toLowerCase();
    if (!validHost(h)) throw Object.assign(new Error('域名格式不对'), { status: 422, code: 'validation_error' });
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    const idx = store.projects.findIndex((p) => p.id === projectId);
    if (idx < 0) throw Object.assign(new Error('项目不存在'), { status: 404, code: 'not_found' });
    const p = store.projects[idx];
    if ((p.domains || []).some((d) => d.host === h)) {
      throw Object.assign(new Error('该项目下已有此域名'), { status: 409, code: 'conflict' });
    }
    const m = method === 'file' || method === 'meta' ? method : 'dns';
    const domain = domainSchema.parse({
      host: h,
      verified: false,
      method: m,
      addedAt: new Date().toISOString(),
      verifiedAt: null,
      lastSeenAt: null,
    });
    p.domains = [...(p.domains || []), domain];
    p.updatedAt = new Date().toISOString();
    store.projects[idx] = p;
    this.writeStore(store);
    return domain;
  }

  removeDomain(apiKeyRaw: string, projectId: string, host: string): void {
    const h = String(host || '').trim().toLowerCase();
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    const idx = store.projects.findIndex((p) => p.id === projectId);
    if (idx < 0) throw Object.assign(new Error('项目不存在'), { status: 404, code: 'not_found' });
    const p = store.projects[idx];
    const before = (p.domains || []).length;
    p.domains = (p.domains || []).filter((d) => d.host !== h);
    if (p.domains.length === before) {
      throw Object.assign(new Error('域名不存在'), { status: 404, code: 'not_found' });
    }
    p.updatedAt = new Date().toISOString();
    store.projects[idx] = p;
    this.writeStore(store);
  }

  verifyDomain(apiKeyRaw: string, projectId: string, host: string): ConsoleDomain {
    const h = String(host || '').trim().toLowerCase();
    const store = this.readStore(this.ownerHash(apiKeyRaw));
    const idx = store.projects.findIndex((p) => p.id === projectId);
    if (idx < 0) throw Object.assign(new Error('项目不存在'), { status: 404, code: 'not_found' });
    const p = store.projects[idx];
    const d = (p.domains || []).find((x) => x.host === h);
    if (!d) throw Object.assign(new Error('域名不存在'), { status: 404, code: 'not_found' });
    d.verified = true;
    d.verifiedAt = new Date().toISOString();
    p.updatedAt = new Date().toISOString();
    store.projects[idx] = p;
    this.writeStore(store);
    return d;
  }
}

export const consoleProjectService = new ConsoleProjectService();
