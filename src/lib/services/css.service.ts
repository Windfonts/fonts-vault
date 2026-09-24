import type { Font } from '@/lib/db/schema';
import { clipFallbackCss } from '@/lib/css-unicode-range';
import { evaluateLicense } from '@/lib/license-gate';
import { logger } from '@/lib/logger';
import { fontService } from './font.service';
import { cssApiSchema, type CssApiDto } from './validation';

interface CacheEntry {
  css: string;
  etag: string;
  timestamp: number;
}

type WeightEntry = { weight_name?: string; font_weight?: number };

export class CSSService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 30 * 60 * 1000; // 30分钟

  private get proxyBaseUrl(): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:4000';
    return `${baseUrl}/api/proxy`;
  }

  private get cdnBaseUrl(): string {
    const cdnEnv = process.env.NEXT_PUBLIC_FONT_STATIC_URL;
    return (cdnEnv && cdnEnv.replace(/\/$/, '')) || '';
  }

  /**
   * 生成字体CSS。
   * 直接从 OSS 取预生成 CSS。带 fallback 时：主款全文 + 补全款仅主款缺口 unicode-range。
   */
  async generateCSS(params: CssApiDto): Promise<{ css: string; etag: string }> {
    const validated = cssApiSchema.parse(params);
    const normalizedFamily = validated.family.trim();
    const normalizedWeight = (validated.weight || 'regular').trim().toLowerCase();
    const normalizedVersion = (validated.version || 'full').toLowerCase() as
      | 'en'
      | 'zh'
      | 'zh-common'
      | 'full';
    const fallbackFamily = validated.fallback?.trim() || '';
    const fallbackWeightRaw = validated.fallbackWeight?.trim().toLowerCase() || '';

    const cacheKey = this.getCacheKey(
      normalizedFamily,
      normalizedWeight,
      normalizedVersion,
      fallbackFamily,
      fallbackWeightRaw
    );

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const font = await this.resolveFont(normalizedFamily);
    this.assertCssAllowed(font, normalizedFamily);

    await fontService.incrementApiCallCount(font.id);

    const primaryCss = await this.fetchOSSCSS(font, normalizedWeight, normalizedVersion);
    if (!primaryCss) {
      throw new Error(
        `字体 ${validated.family} 的 ${validated.weight} 字重 ${normalizedVersion} 版本不存在`
      );
    }

    let css = primaryCss;

    if (fallbackFamily) {
      const fallbackFont = await this.resolveFont(fallbackFamily);
      this.assertCssAllowed(fallbackFont, fallbackFamily);
      await fontService.incrementApiCallCount(fallbackFont.id);

      const aligned =
        fallbackWeightRaw ||
        this.alignWeightName(fallbackFont, this.weightCssNumber(font, normalizedWeight));
      if (!aligned) {
        throw new Error(
          `补全字体 ${fallbackFamily} 无与主款字重 ${normalizedWeight} 对齐的 font_weight，已拒绝双载`
        );
      }

      const fallbackCss = await this.fetchOSSCSS(fallbackFont, aligned, normalizedVersion);
      if (!fallbackCss) {
        throw new Error(
          `补全字体 ${fallbackFamily} 的 ${aligned} 字重 ${normalizedVersion} 版本不存在`
        );
      }

      const clipped = clipFallbackCss(primaryCss, fallbackCss);
      if (clipped) {
        css =
          primaryCss +
          `\n\n/* lineage/locale fallback · gaps only · ${fallbackFont.normalizedName}/${aligned} */\n` +
          clipped;
      } else {
        css =
          primaryCss +
          `\n\n/* fallback ${fallbackFont.normalizedName}: no unicode-range gaps vs primary */\n`;
        logger.info('[CSSService] fallback 无缺口可裁，仅返回主款', {
          family: font.normalizedName,
          fallback: fallbackFont.normalizedName,
          version: normalizedVersion,
        });
      }
    }

    const etag = this.generateETag(css);
    this.setCache(cacheKey, css, etag);
    return { css, etag };
  }

  private assertCssAllowed(font: Font, label: string): void {
    const gate = evaluateLicense({
      normalizedName: font.normalizedName,
      license: font.license,
      licenseType: font.licenseType,
    });
    if (!gate.cssAllowed) {
      throw new Error(
        `字体 ${font.normalizedName || label} 当前不可通过公共 CSS/CDN 分发（${gate.displayLabel}）。请查看详情页授权说明。`
      );
    }
  }

  /** 读取 data/family-aliases.json；缺文件则原样返回 */
  private resolveFamilyAlias(family: string): string {
    const key = family.trim().toLowerCase();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const file = path.join(process.cwd(), 'data', 'family-aliases.json');
      if (!fs.existsSync(file)) return family.trim();
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
        aliases?: Record<string, string>;
      };
      const hit = raw.aliases?.[key];
      if (hit) return hit;
    } catch {
      /* ignore */
    }
    return family.trim();
  }

  private async resolveFont(token: string): Promise<Font> {
    const raw = token.trim();
    const normalizedFamily = this.resolveFamilyAlias(raw);
    let font: Font | undefined;
    const fontsByFamily = await fontService.findByFontFamily(normalizedFamily);
    if (fontsByFamily && fontsByFamily.length > 0) {
      font = fontsByFamily.find((f) => f.status === 'published') || fontsByFamily[0];
    } else {
      font = await fontService.findByNormalizedName(normalizedFamily);
      if (!font && normalizedFamily !== raw) {
        font = await fontService.findByNormalizedName(raw);
      }
    }
    if (!font && typeof (fontService as { findByEnglishName?: Function }).findByEnglishName === 'function') {
      font = await (
        fontService as { findByEnglishName: (n: string) => Promise<Font | undefined> }
      ).findByEnglishName(normalizedFamily);
    }
    if (!font) {
      const hinted = await fontService.search(normalizedFamily).catch(() => [] as Font[]);
      if (hinted && hinted.length === 1) {
        font = hinted[0];
      } else {
        const keys = (hinted || [])
          .slice(0, 8)
          .map((f) => f.normalizedName || f.fontFamily)
          .filter(Boolean);
        const hint = keys.length
          ? `可用 family 示例：${keys.join(', ')}（请用 normalizedName / fontFamily，不是展示名空格形式）`
          : '请使用字体的 normalizedName（如 wenfeng-ibmps）或 fontFamily';
        throw new Error(`字体 ${token} 不存在。${hint}`);
      }
    }
    return font;
  }

  private weightCssNumber(font: Font, weightName: string): number {
    const weights = (font.weights || {}) as Record<string, WeightEntry>;
    const hit = Object.keys(weights).find((n) => n.toLowerCase() === weightName.toLowerCase());
    if (hit && typeof weights[hit]?.font_weight === 'number') {
      return weights[hit].font_weight as number;
    }
    return 400;
  }

  private alignWeightName(font: Font, wantCss: number): string | null {
    const weights = (font.weights || {}) as Record<string, WeightEntry>;
    for (const name of Object.keys(weights)) {
      if (weights[name]?.font_weight === wantCss) return name;
    }
    return null;
  }

  private async fetchOSSCSS(
    font: Font,
    weightName: string,
    version: string
  ): Promise<string | null> {
    const normalizedWeightName = weightName.trim().toLowerCase();
    const availableWeights = Object.keys(font.weights);
    const matchedWeightName = availableWeights.find(
      (name) => name.toLowerCase() === normalizedWeightName
    );

    let weightData = matchedWeightName ? font.weights[matchedWeightName] : font.weights[weightName];
    let actualWeightName = matchedWeightName || weightName;

    if (!weightData) {
      logger.warn('[CSSService] 字重不存在，尝试回退到第一个可用字重', {
        normalizedName: font.normalizedName,
        weightName,
        availableWeightsCount: availableWeights.length,
      });
      if (availableWeights.length === 0) {
        logger.error('[CSSService] 字体没有任何字重', {
          normalizedName: font.normalizedName,
        });
        return null;
      }
      actualWeightName = availableWeights[0];
      weightData = font.weights[actualWeightName];
      logger.debug('[CSSService] 使用回退字重', {
        normalizedName: font.normalizedName,
        actualWeightName,
      });
    }

    const ossEndpoint =
      process.env.OSS_ENDPOINT || 'https://wenfeng-fonts.oss-cn-guangzhou.aliyuncs.com';
    const cssUrl = `${ossEndpoint}/fonts-packages/${font.normalizedName}/${actualWeightName}/${version}/result.css`;

    try {
      logger.debug('[CSSService] 正在获取CSS', {
        normalizedName: font.normalizedName,
        weightName: actualWeightName,
        version,
        cssUrl,
      });
      const response = await fetch(cssUrl);

      if (!response.ok) {
        logger.debug('[CSSService] CSS文件不存在', {
          normalizedName: font.normalizedName,
          weightName: actualWeightName,
          version,
          status: response.status,
          cssUrl,
        });
        return null;
      }

      let css = await response.text();
      logger.debug('[CSSService] CSS获取成功', {
        normalizedName: font.normalizedName,
        weightName: actualWeightName,
        version,
        length: css.length,
      });

      const basePath = `fonts-packages/${font.normalizedName}/${actualWeightName}/${version}`;
      const targetBase = this.cdnBaseUrl || this.proxyBaseUrl;

      css = css.replace(/url\(['"]?\.\/([^'")\s]+)['"]?\)/g, (_match, filename) => {
        return `url('${targetBase}/${basePath}/${filename}')`;
      });

      const escapedEndpoint = ossEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      css = css.replace(
        new RegExp(`url\\(['"]?${escapedEndpoint}/([^'"\\)\\s]+)['"]?\\)`, 'g'),
        (_match, path) => {
          return `url('${targetBase}/${path}')`;
        }
      );

      return `/* ${font.name} - ${actualWeightName} (${version}) */\n${css}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[CSSService] 获取CSS失败', {
        normalizedName: font.normalizedName,
        weightName: actualWeightName,
        version,
        cssUrl,
        error: errorMessage,
      });
      return null;
    }
  }

  private getCacheKey(
    family: string,
    weight?: string,
    version?: string,
    fallback?: string,
    fallbackWeight?: string
  ): string {
    const normalizedFamily = family.toLowerCase();
    const normalizedWeight = (weight || 'regular').toLowerCase();
    const normalizedVersion = (version || 'full').toLowerCase();
    const fb = (fallback || '').toLowerCase();
    const fbw = (fallbackWeight || '').toLowerCase();
    return `${normalizedFamily}|${normalizedWeight}|${normalizedVersion}|fb:${fb}|fbw:${fbw}`;
  }

  private getFromCache(key: string): { css: string; etag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return {
      css: entry.css,
      etag: entry.etag,
    };
  }

  private setCache(key: string, css: string, etag: string): void {
    this.cache.set(key, {
      css,
      etag,
      timestamp: Date.now(),
    });
  }

  private generateETag(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }

  clearCache(family?: string): void {
    if (family) {
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(family)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  async invalidateFontCache(fontId: string): Promise<void> {
    const font = await fontService.findById(fontId);
    if (font) {
      this.clearCache(font.normalizedName);
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cssService = new CSSService();
