import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { cssService } from './css.service';
import {
  projectManifestSchema,
  type ProjectManifest,
  type ProjectManifestDto,
} from './validation';

const DISPLAY_VALUES = new Set(['auto', 'block', 'swap', 'fallback', 'optional']);

export class ProjectService {
  private rootDir(): string {
    return path.join(process.cwd(), 'data', 'projects');
  }

  private filePath(slug: string): string {
    return path.join(this.rootDir(), `${slug}.json`);
  }

  normalizeSlug(raw: string): string {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  load(slug: string): ProjectManifest | null {
    const key = this.normalizeSlug(slug);
    if (!key) return null;
    const file = this.filePath(key);
    if (!fs.existsSync(file)) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
      return projectManifestSchema.parse(raw);
    } catch (error) {
      logger.error('[ProjectService] 清单损坏', { slug: key, error });
      return null;
    }
  }

  save(input: ProjectManifestDto, opts?: { ownerKeyHash?: string | null }): ProjectManifest {
    const slug = this.normalizeSlug(input.slug);
    if (!slug) throw new Error('slug 无效');

    const existing = this.load(slug);
    if (existing?.ownerKeyHash && opts?.ownerKeyHash && existing.ownerKeyHash !== opts.ownerKeyHash) {
      throw new Error('无权覆盖该项目（密钥不匹配）');
    }

    const manifest: ProjectManifest = projectManifestSchema.parse({
      ...input,
      slug,
      version: Number(input.version) || (existing ? existing.version + 1 : 1),
      publishedAt: new Date().toISOString(),
      ownerKeyHash: opts?.ownerKeyHash || existing?.ownerKeyHash || null,
    });

    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath(slug), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    return manifest;
  }

  /**
   * 域名白名单：空列表 = 放行（便于 demo / 开发）。
   * localhost / 127.0.0.1 始终放行。支持 *.example.com。
   */
  isHostAllowed(manifest: ProjectManifest, host: string | null | undefined): boolean {
    const h = String(host || '')
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, '');
    if (!h || h === 'localhost' || h === '127.0.0.1') return true;
    const list = (manifest.domains || []).map((d) => d.trim().toLowerCase()).filter(Boolean);
    if (!list.length) return true;
    return list.some((rule) => {
      if (rule === h) return true;
      if (rule.startsWith('*.')) {
        const suffix = rule.slice(1); // .example.com
        return h.endsWith(suffix) && h !== rule.slice(2);
      }
      return false;
    });
  }

  hostFromRequest(request: Request): string | null {
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        return new URL(origin).hostname.toLowerCase();
      } catch {
        /* ignore */
      }
    }
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        return new URL(referer).hostname.toLowerCase();
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  applyDisplay(css: string, display: string | undefined): string {
    const d = String(display || '').trim().toLowerCase();
    if (!d || !DISPLAY_VALUES.has(d)) return css;
    return css.replace(/font-display\s*:\s*[^;]+;/gi, `font-display: ${d};`);
  }

  async bakeCss(manifest: ProjectManifest): Promise<{ css: string; etag: string }> {
    const chunks: string[] = [];
    chunks.push(
      `/* windfonts project · ${manifest.slug} · v${manifest.version}` +
        (manifest.publishedAt ? ` · ${manifest.publishedAt}` : '') +
        ' */'
    );

    for (const font of manifest.fonts) {
      const weights = font.weights.length ? font.weights : ['regular'];
      for (const weight of weights) {
        const { css } = await cssService.generateCSS({
          family: font.family,
          weight: weight.toLowerCase(),
          version: font.subset,
          fallback: font.fallback,
          fallbackWeight: font.fallbackWeight,
          localeFallback: font.localeFallback,
        });
        chunks.push(
          `\n/* ${font.family} · ${weight} · ${font.subset}` +
            (font.fallback ? ` · fallback ${font.fallback}` : '') +
            ' */\n' +
            this.applyDisplay(css, manifest.display)
        );
      }
    }

    const css = chunks.join('\n');
    const etag = `"${createHash('sha256').update(css).digest('hex').slice(0, 16)}"`;
    return { css, etag };
  }
}

export const projectService = new ProjectService();
