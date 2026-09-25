import type { Font } from '@/lib/db/schema';
import { logger } from '@/lib/logger';
import { brandService } from './brand.service';
import { categoryService } from './category.service';
import { fontService } from './font.service';
import { styleService } from './style.service';
import type { FontCreateDto, FontUpdateDto } from './validation';

// JSON映射文件结构
interface FontMappingJSON {
  [normalizedName: string]: {
    normalized_name: string;
    font_family: string;
    original_name: string;
    weights: {
      [weightName: string]: {
        font_family: string;
        weight_name: string;
        font_weight: number;
        versions: {
          [versionName: string]: {
            file: string;
            char_count: number;
            glyph_count: number;
            subfamily_name: string;
            typographic_subfamily: string;
          };
        };
      };
    };
    english_name: string;
    chinese_name: string | 'null';
    designer: string | 'null';
    foundry: string | 'null';
    release_year: number | 'null';
    category: string | null;
    font_category: string | null;
    style: string | null;
    copyright: string | 'null';
    license: string | 'null';
    license_type: string | 'null';
    version: string;
    description: string;
    tags: string[];
    font_tags: string[];
    languages: string[];
    use_cases: string[];
  };
}

export interface SyncResult {
  added: number;
  updated: number;
  failed: string[];
}

// 分类映射
const categoryMapping: Record<string, string> = {
  无衬线字体: 'sans-serif',
  手写体: 'handwriting',
  衬线字体: 'serif',
  书法体: 'calligraphy',
  艺术字: 'artistic',
  像素字体: 'pixel',
  等宽字体: 'monospace',
  黑体: 'gothic',
  宋体: 'song',
  楷体: 'kai',
  仿宋: 'fangsong',
};

// 品牌映射
const brandMapping: Record<string, string> = {
  龚帆字库: 'gongfan',
  方正字库: 'fangzheng',
  汉仪字库: 'hanyi',
  造字工房: 'makefont',
  文悦字库: 'wenyue',
  站酷字库: 'zcool',
  思源字体: 'source',
  'Google Fonts': 'google',
  Adobe: 'adobe',
};

export class SyncService {
  private ossEndpoint: string;
  private ossFolder: string;
  private mappingUrl: string;
  private analysisUrl?: string;
  private metadataVersion: string;
  private excludedStyleNames = new Set(['简体中文', '繁体中文']);

  constructor() {
    this.ossEndpoint =
      process.env.OSS_ENDPOINT || 'https://wenfeng-fonts.oss-cn-guangzhou.aliyuncs.com';
    this.ossFolder = process.env.OSS_FOLDER || 'font-packages/metadata';
    const files = (process.env.OSS_METADATA_FILE || 'font-mapping.json')
      .split(',')
      .map((s) => s.trim());
    const mappingFile = files.find((f) => f.includes('mapping')) || files[0];
    const analysisFile = files.find((f) => f.includes('analysis'));
    // metadata 原地覆盖时 CDN 可能按 URL 长缓存；版本串打进 query 强制换键。
    this.metadataVersion = (process.env.OSS_METADATA_VERSION || '').trim();
    this.mappingUrl = this.withMetadataVersion(
      `${this.ossEndpoint}/${this.ossFolder}/${mappingFile}`
    );
    this.analysisUrl = analysisFile
      ? this.withMetadataVersion(`${this.ossEndpoint}/${this.ossFolder}/${analysisFile}`)
      : undefined;
  }

  private withMetadataVersion(url: string): string {
    if (!this.metadataVersion) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${encodeURIComponent(this.metadataVersion)}`;
  }

  private parseString(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') return undefined;
    return trimmed;
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  /**
   * 从OSS同步字体列表
   */
  async syncFromOSS(): Promise<SyncResult> {
    logger.info('[SyncService] 开始从OSS同步字体列表', {
      mappingUrl: this.mappingUrl,
      analysisUrl: this.analysisUrl,
    });

    const result: SyncResult = {
      added: 0,
      updated: 0,
      failed: [],
    };

    try {
      // 1. 获取JSON文件
      logger.debug('[SyncService] 正在获取JSON映射文件...' + this.mappingUrl);
      const response = await fetch(this.mappingUrl);
      logger.debug('[SyncService] JSON映射文件响应', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
      if (!response.ok) {
        const error = `Failed to fetch JSON mapping: ${response.statusText}`;
        logger.error('[SyncService] 获取JSON映射文件失败', {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(error);
      }

      const jsonData: FontMappingJSON = await response.json();

      const totalFonts = Object.keys(jsonData).length;
      logger.info('[SyncService] JSON映射文件获取成功', {
        totalFonts,
      });

      const allTags = new Set<string>();
      for (const fontData of Object.values(jsonData)) {
        if (!Array.isArray(fontData.font_tags)) continue;
        for (const tag of fontData.font_tags) {
          if (typeof tag !== 'string') continue;
          const trimmed = tag.trim();
          if (trimmed && !this.excludedStyleNames.has(trimmed)) allTags.add(trimmed);
        }
      }
      await this.removeExcludedStyles();
      await this.ensureStylesFromTags(Array.from(allTags));

      // 2. 遍历每个字体
      let processed = 0;
      for (const [normalizedName, fontData] of Object.entries(jsonData)) {
        try {
          processed++;
          logger.debug('[SyncService] 处理字体', {
            normalizedName,
            progress: `${processed}/${totalFonts}`,
          });

          // 3. 转换数据格式
          const fontRecord = await this.transformJSONToFont(normalizedName, fontData);

          // 4. 检查是否已存在
          const existing = await fontService.findByNormalizedName(normalizedName);

          if (existing) {
            // 更新现有记录 - 使用智能合并策略
            const mergedRecord = this.mergeWithExisting(existing, fontRecord);
            await fontService.update(existing.id, mergedRecord);
            result.updated++;
            logger.debug('[SyncService] 字体已更新', { normalizedName });
          } else {
            // 创建新记录
            await fontService.create(fontRecord);
            result.added++;
            logger.debug('[SyncService] 字体已创建', { normalizedName });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.failed.push(`${normalizedName}: ${errorMessage}`);
          logger.warn('[SyncService] 字体处理失败', {
            normalizedName,
            error: errorMessage,
          });
        }
      }

      logger.info('[SyncService] 同步完成', {
        added: result.added,
        updated: result.updated,
        failed: result.failed.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[SyncService] 同步失败', {
        error: errorMessage,
      });
      throw new Error(`同步失败: ${errorMessage}`);
    }

    return result;
  }

  private async ensureStylesFromTags(tags: string[]) {
    if (!tags.length) return;
    const existing = await styleService.findAll();
    const existingNames = new Set(existing.map((s) => s.name));
    let order = existing.length;
    const sorted = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))).sort();
    for (const name of sorted) {
      if (existingNames.has(name)) continue;
      const slug = this.slugify(name);
      if (!slug) continue;
      try {
        await styleService.create({ name, slug, order });
        order += 1;
        existingNames.add(name);
      } catch (error) {
        logger.warn('[SyncService] 创建风格失败', {
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async removeExcludedStyles() {
    const excluded = Array.from(this.excludedStyleNames);
    if (!excluded.length) return;
    for (const name of excluded) {
      const existing = await styleService.findByName(name);
      if (!existing) continue;
      try {
        await styleService.delete(existing.id);
      } catch (error) {
        logger.warn('[SyncService] 删除风格失败', {
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * 智能合并策略：保留用户手动修改的字段
   * 只更新来自OSS的"源数据"字段，保留用户自定义的字段
   */
  private mergeWithExisting(existing: Font, ossData: FontCreateDto): Partial<FontUpdateDto> {
    // 始终从OSS更新的字段（这些是"源数据"）
    const alwaysUpdateFields = [
      'weights', // 字重信息
      'version', // 版本号
      'fontFamily', // 字体族名
      'originalName', // 原始名称
      'englishName', // 英文名
      'chineseName', // 中文名
      'copyright', // 版权信息
      'designer', // 设计师
      'foundry', // 品牌商
      'releaseYear', // 发布年份
      'license', // 许可证
      'licenseType', // 许可证类型
      'ossPath', // OSS路径
    ] as const satisfies Array<keyof FontCreateDto & keyof FontUpdateDto & keyof Font>;

    // 只在用户未修改时更新的字段（保留用户的自定义内容）
    const conditionalUpdateFields = [
      'name', // 显示名称
      'description', // 描述
      'tags', // 标签
      'fontTags', // 风格
      'languages', // 语言
      'useCases', // 使用场景
      'category', // 分类（原始）
      'fontCategory', // 字体分类
      'style', // 风格
      'categoryId', // 分类ID
      'brandId', // 品牌ID
    ] as const satisfies Array<keyof FontCreateDto & keyof FontUpdateDto & keyof Font>;

    const merged: Partial<FontUpdateDto> = {};
    const setMergedField = <K extends keyof FontUpdateDto>(
      key: K,
      value: FontUpdateDto[K]
    ) => {
      merged[key] = value;
    };

    // 始终更新的字段
    for (const field of alwaysUpdateFields) {
      const value = ossData[field];
      if (value !== undefined) {
        setMergedField(field, value as FontUpdateDto[typeof field]);
      }
    }

    // 条件更新的字段：只在用户未修改时更新
    // 判断逻辑：如果现有值为空或与默认值相同，则认为用户未修改
    for (const field of conditionalUpdateFields) {
      const existingValue = existing[field];
      const ossValue = ossData[field];

      // 如果现有值为空，使用OSS的值
      if (
        existingValue === null ||
        existingValue === undefined ||
        existingValue === '' ||
        (Array.isArray(existingValue) && existingValue.length === 0)
      ) {
        if (ossValue !== undefined) {
          setMergedField(field, ossValue as FontUpdateDto[typeof field]);
        }
      }
      // 否则保留现有值（用户可能已修改）
    }

    logger.debug('[SyncService] 字段合并完成', {
      normalizedName: existing.normalizedName,
      updatedFields: alwaysUpdateFields.filter(
        (f) => ossData[f] !== undefined
      ),
      preservedFields: conditionalUpdateFields.filter(
        (f) => existing[f] !== null && existing[f] !== undefined && existing[f] !== ''
      ),
    });

    return merged;
  }

  /**
   * 转换JSON数据为字体记录
   */
  private async transformJSONToFont(
    normalizedName: string,
    data: FontMappingJSON[string]
  ): Promise<FontCreateDto> {
    const parseString = this.parseString.bind(this);
    const parseNumber = this.parseNumber.bind(this);

    const chineseName = parseString(data.chinese_name);
    const displayName =
      chineseName ||
      parseString(data.english_name) ||
      parseString(data.original_name) ||
      parseString(data.font_family) ||
      normalizedName;

    // 自动映射分类
    let categoryId: string | undefined;
    const rawCategory = (data.font_category || '').trim();
    if (rawCategory) {
      const categorySlug = categoryMapping[rawCategory] || this.slugify(rawCategory);
      if (!categorySlug) {
        // 跳过无效的分类slug
      } else {
        let category = await categoryService.findBySlug(categorySlug);

        // 如果分类不存在，创建新分类
        if (!category) {
          logger.debug('[SyncService] 创建新分类', {
            name: rawCategory,
            slug: categorySlug,
          });
          category = await categoryService.create({
            name: rawCategory,
            slug: categorySlug,
            description: `${rawCategory}类型的字体`,
            order: 0,
          });
        }

        categoryId = category.id;
      }
    }

    // 自动映射品牌
    let brandId: string | undefined;
    const foundry = parseString(data.foundry);
    if (foundry) {
      const brandSlug = brandMapping[foundry] || this.slugify(foundry);
      if (!brandSlug) {
        // 跳过无效的品牌slug
      } else {
        let brand = await brandService.findBySlug(brandSlug);

        // 如果品牌不存在，创建新品牌
        if (!brand) {
          logger.debug('[SyncService] 创建新品牌', {
            name: foundry,
            slug: brandSlug,
          });
          brand = await brandService.create({
            name: foundry,
            slug: brandSlug,
            description: `${foundry}出品的字体`,
            status: 'published',
          });
        }

        brandId = brand.id;
      }
    }

    return {
      normalizedName,
      name: displayName,
      englishName: parseString(data.english_name),
      chineseName,
      fontFamily: data.font_family,
      originalName: parseString(data.original_name),
      weights: data.weights,
      version: data.version,
      copyright: parseString(data.copyright),
      description: parseString(data.description),
      designer: parseString(data.designer),
      foundry,
      releaseYear: parseNumber(data.release_year),
      category: parseString(data.category),
      fontCategory: data.font_category,
      style: parseString(data.style),
      categoryId,
      brandId,
      tags: data.tags || [],
      fontTags: data.font_tags || [],
      languages: data.languages || [],
      useCases: data.use_cases || [],
      license: parseString(data.license),
      licenseType: parseString(data.license_type),
      ossPath: `/font-packages/${normalizedName}`,
    };
  }

  /**
   * 生成slug
   * 支持中文字符，使用拼音或保留原文
   */
  private slugify(text: string): string {
    // 如果文本包含中文字符，使用简单的转换策略
    // 将空格和特殊字符替换为连字符
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '') // 保留字母、数字、中文和连字符
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * 同步单个字体
   */
  async syncSingleFont(normalizedName: string): Promise<void> {
    logger.info('[SyncService] 开始同步单个字体', { normalizedName });

    try {
      const response = await fetch(this.mappingUrl);
      if (!response.ok) {
        const error = `Failed to fetch JSON mapping: ${response.statusText}`;
        logger.error('[SyncService] 获取JSON映射文件失败', {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(error);
      }

      const jsonData: FontMappingJSON = await response.json();
      const fontData = jsonData[normalizedName];

      if (!fontData) {
        const error = `Font ${normalizedName} not found in JSON mapping`;
        logger.error('[SyncService] 字体未找到', { normalizedName });
        throw new Error(error);
      }

      const fontRecord = await this.transformJSONToFont(normalizedName, fontData);
      const existing = await fontService.findByNormalizedName(normalizedName);

      if (existing) {
        const mergedRecord = this.mergeWithExisting(existing, fontRecord);
        await fontService.update(existing.id, mergedRecord);
        logger.info('[SyncService] 单个字体已更新', { normalizedName });
      } else {
        await fontService.create(fontRecord);
        logger.info('[SyncService] 单个字体已创建', { normalizedName });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[SyncService] 单个字体同步失败', {
        normalizedName,
        error: errorMessage,
      });
      throw error;
    }
  }

  async fetchMetadataPreview(limit: number = 50): Promise<
    Array<{
      normalizedName: string;
      name: string;
      fontFamily: string;
      version: string;
      fontCategory?: string;
      foundry?: string;
      licenseType?: string;
      tags?: string[];
      languages?: string[];
      weightsSummary: Array<{
        weightName: string;
        fontWeight: number;
        versions: Array<{ name: string; file: string; charCount: number; glyphCount: number }>;
      }>;
      analysis?: unknown;
    }>
  > {
    const res = await fetch(this.mappingUrl);
    if (!res.ok) throw new Error('无法获取映射文件');
    const mapping: FontMappingJSON = await res.json();

    let analysis: Record<string, unknown> | undefined;
    if (this.analysisUrl) {
      try {
        const ar = await fetch(this.analysisUrl);
        if (ar.ok) analysis = await ar.json();
      } catch {}
    }

    const entries = Object.entries(mapping).slice(0, limit);
    const parseString = this.parseString.bind(this);
    return entries.map(([normalizedName, data]) => {
      const weightsSummary = Object.values(data.weights).map((w) => ({
        weightName: w.weight_name,
        fontWeight: w.font_weight,
        versions: Object.entries(w.versions).map(([vName, v]) => ({
          name: vName,
          file: v.file,
          charCount: v.char_count,
          glyphCount: v.glyph_count,
        })),
      }));
      const preview: {
        normalizedName: string;
        name: string;
        fontFamily: string;
        version: string;
        fontCategory?: string;
        foundry?: string;
        licenseType?: string;
        tags?: string[];
        languages?: string[];
        weightsSummary: Array<{
          weightName: string;
          fontWeight: number;
          versions: Array<{ name: string; file: string; charCount: number; glyphCount: number }>;
        }>;
        analysis?: unknown;
      } = {
        normalizedName,
        name:
          parseString(data.chinese_name) ||
          parseString(data.english_name) ||
          parseString(data.original_name) ||
          parseString(data.font_family) ||
          normalizedName,
        fontFamily: data.font_family,
        version: data.version,
        fontCategory: data.font_category || undefined,
        foundry: parseString(data.foundry),
        licenseType:
          parseString(data.license_type),
        tags: data.tags || [],
        languages: data.languages || [],
        weightsSummary,
      };
      if (analysis && analysis[normalizedName]) {
        preview.analysis = analysis[normalizedName];
      }
      return preview;
    });
  }

  async fetchFontAnalysis(normalizedName: string): Promise<Record<string, unknown> | undefined> {
    if (!this.analysisUrl) {
      return undefined;
    }

    try {
      const res = await fetch(this.analysisUrl);

      if (!res.ok) {
        return undefined;
      }

      const json = (await res.json()) as { fonts?: Array<Record<string, unknown>> };

      // JSON 结构是 { summary: {...}, fonts: [{name: '...', children: [...]}] }
      if (!json.fonts || !Array.isArray(json.fonts)) {
        return undefined;
      }

      // 在 fonts 数组中查找 name 等于 normalizedName 的对象
      const fontData = json.fonts.find(
        (font) => typeof font.name === 'string' && font.name === normalizedName
      );

      if (fontData) {
        // 返回第一个 child（通常是 Regular 或默认字重）
        if (Array.isArray(fontData.children) && fontData.children.length > 0) {
          const firstChild = fontData.children[0];
          return typeof firstChild === 'object' && firstChild !== null
            ? (firstChild as Record<string, unknown>)
            : undefined;
        } else {
          return fontData;
        }
      }

      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[SyncService] 获取字体分析数据失败', {
        normalizedName,
        error: errorMessage,
      });
      return undefined;
    }
  }
}

// 导出单例实例
export const syncService = new SyncService();
