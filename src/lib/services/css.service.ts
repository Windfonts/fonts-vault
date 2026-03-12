import type { Font } from '@/lib/db/schema';
import { logger } from '@/lib/logger';
import { fontService } from './font.service';
import { cssApiSchema, type CssApiDto } from './validation';

interface CacheEntry {
  css: string;
  etag: string;
  timestamp: number;
}

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
   * 生成字体CSS
   * 直接从OSS获取预生成的CSS文件
   */
  async generateCSS(params: CssApiDto): Promise<{ css: string; etag: string }> {
    // 验证参数
    const validated = cssApiSchema.parse(params);
    const { family, weight, version } = validated;
    const normalizedFamily = family.trim();
    const normalizedWeight = weight.trim().toLowerCase();
    const normalizedVersion = version.toLowerCase() as 'en' | 'zh' | 'zh-common' | 'full';

    // 生成缓存键
    const cacheKey = this.getCacheKey(normalizedFamily, normalizedWeight, normalizedVersion);

    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 查找字体：先尝试通过 fontFamily 查找，再尝试 normalizedName
    let font: Font | undefined;
    const fontsByFamily = await fontService.findByFontFamily(normalizedFamily);
    if (fontsByFamily && fontsByFamily.length > 0) {
      font = fontsByFamily[0]; // 使用第一个匹配的字体
    } else {
      font = await fontService.findByNormalizedName(normalizedFamily);
    }

    if (!font) {
      throw new Error(`字体 ${family} 不存在`);
    }

    // 增加API调用次数
    await fontService.incrementApiCallCount(font.id);

    // 获取CSS
    const css = await this.fetchOSSCSS(font, normalizedWeight, normalizedVersion);

    if (!css) {
      throw new Error(`字体 ${family} 的 ${weight} 字重 ${version} 版本不存在`);
    }

    const etag = this.generateETag(css);

    // 存入缓存
    this.setCache(cacheKey, css, etag);

    return { css, etag };
  }

  /**
   * 从OSS获取预生成的CSS文件
   * 直接请求指定版本，不存在则返回null
   */
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

    // 查找对应的字重
    let weightData = matchedWeightName ? font.weights[matchedWeightName] : font.weights[weightName];
    let actualWeightName = matchedWeightName || weightName;

    // 如果指定的字重不存在，使用第一个可用字重
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

      // 基础路径
      const basePath = `fonts-packages/${font.normalizedName}/${actualWeightName}/${version}`;

      // 目标基准：优先使用 CDN，其次使用代理
      const targetBase = this.cdnBaseUrl || this.proxyBaseUrl;

      // 替换相对路径 url('./xxx') 为 CDN/代理地址
      css = css.replace(/url\(['"]?\.\/([^'")\s]+)['"]?\)/g, (match, filename) => {
        return `url('${targetBase}/${basePath}/${filename}')`;
      });

      // 替换绝对路径（如果CSS中包含完整的OSS URL）
      const escapedEndpoint = ossEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      css = css.replace(
        new RegExp(`url\\(['"]?${escapedEndpoint}/([^'"\\)\\s]+)['"]?\\)`, 'g'),
        (match, path) => {
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

  /**
   * 生成缓存键
   */
  private getCacheKey(family: string, weight?: string, version?: string): string {
    const normalizedFamily = family.toLowerCase();
    const normalizedWeight = (weight || 'regular').toLowerCase();
    const normalizedVersion = (version || 'full').toLowerCase();
    return `${normalizedFamily}|${normalizedWeight}|${normalizedVersion}`;
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): { css: string; etag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return {
      css: entry.css,
      etag: entry.etag,
    };
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, css: string, etag: string): void {
    this.cache.set(key, {
      css,
      etag,
      timestamp: Date.now(),
    });
  }

  /**
   * 生成ETag
   */
  private generateETag(content: string): string {
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }

  /**
   * 清除缓存
   */
  clearCache(family?: string): void {
    if (family) {
      // 清除特定字体的缓存
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(family)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }

  /**
   * 使字体缓存失效
   */
  async invalidateFontCache(fontId: string): Promise<void> {
    const font = await fontService.findById(fontId);
    if (font) {
      this.clearCache(font.normalizedName);
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 导出单例实例
export const cssService = new CSSService();
