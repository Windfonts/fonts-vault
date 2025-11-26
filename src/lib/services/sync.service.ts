import { logger } from '@/lib/logger';
import { brandService } from './brand.service';
import { categoryService } from './category.service';
import { fontService } from './font.service';
import type { FontCreateDto } from './validation';

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
    font_category: string;
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

  constructor() {
    this.ossEndpoint =
      process.env.OSS_ENDPOINT || 'https://wenfeng-fonts.oss-cn-guangzhou.aliyuncs.com';
    this.ossFolder = process.env.OSS_FOLDER || 'font-packages/metadata';
    const files = (process.env.OSS_METADATA_FILE || 'font-mapping.json')
      .split(',')
      .map((s) => s.trim());
    const mappingFile = files.find((f) => f.includes('mapping')) || files[0];
    const analysisFile = files.find((f) => f.includes('analysis'));
    this.mappingUrl = `${this.ossEndpoint}/${this.ossFolder}/${mappingFile}`;
    this.analysisUrl = analysisFile
      ? `${this.ossEndpoint}/${this.ossFolder}/${analysisFile}`
      : undefined;
  }

  private parseNull(value: any): any {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim().toLowerCase() === 'null') return undefined;
    return value;
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
      console.log(response);
      if (!response.ok) {
        const error = `Failed to fetch JSON mapping: ${response.statusText}`;
        logger.error('[SyncService] 获取JSON映射文件失败', {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(error);
      }

      const jsonData: FontMappingJSON = await response.json();

      let analysisData: any | undefined;
      if (this.analysisUrl) {
        try {
          logger.debug('[SyncService] 正在获取分析文件...');
          const ar = await fetch(this.analysisUrl);
          if (ar.ok) {
            analysisData = await ar.json();
            logger.info('[SyncService] 分析文件获取成功');
          } else {
            logger.warn('[SyncService] 分析文件获取失败', {
              status: ar.status,
              statusText: ar.statusText,
            });
          }
        } catch {
          logger.warn('[SyncService] 读取分析文件异常');
        }
      }
      const totalFonts = Object.keys(jsonData).length;
      logger.info('[SyncService] JSON映射文件获取成功', {
        totalFonts,
      });

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

  /**
   * 智能合并策略：保留用户手动修改的字段
   * 只更新来自OSS的"源数据"字段，保留用户自定义的字段
   */
  private mergeWithExisting(existing: any, ossData: FontCreateDto): any {
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
    ];

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
    ];

    const merged: any = { ...existing };

    // 始终更新的字段
    for (const field of alwaysUpdateFields) {
      if (ossData[field as keyof FontCreateDto] !== undefined) {
        merged[field] = ossData[field as keyof FontCreateDto];
      }
    }

    // 条件更新的字段：只在用户未修改时更新
    // 判断逻辑：如果现有值为空或与默认值相同，则认为用户未修改
    for (const field of conditionalUpdateFields) {
      const existingValue = existing[field];
      const ossValue = ossData[field as keyof FontCreateDto];

      // 如果现有值为空，使用OSS的值
      if (
        existingValue === null ||
        existingValue === undefined ||
        existingValue === '' ||
        (Array.isArray(existingValue) && existingValue.length === 0)
      ) {
        merged[field] = ossValue;
      }
      // 否则保留现有值（用户可能已修改）
    }

    logger.debug('[SyncService] 字段合并完成', {
      normalizedName: existing.normalizedName,
      updatedFields: alwaysUpdateFields.filter(
        (f) => ossData[f as keyof FontCreateDto] !== undefined
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
    const parseNull = this.parseNull.bind(this);

    const chineseName = parseNull(data.chinese_name);
    const displayName =
      chineseName ||
      parseNull(data.english_name) ||
      parseNull(data.original_name) ||
      parseNull(data.font_family) ||
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
    const foundry = parseNull(data.foundry)?.toString().trim();
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
      englishName: parseNull(data.english_name),
      chineseName,
      fontFamily: data.font_family,
      originalName: parseNull(data.original_name),
      weights: data.weights,
      version: data.version,
      copyright: parseNull(data.copyright),
      description: parseNull(data.description),
      designer: parseNull(data.designer),
      foundry,
      releaseYear: parseNull(data.release_year) as number | undefined,
      category: parseNull(data.category),
      fontCategory: data.font_category,
      style: parseNull(data.style),
      categoryId,
      brandId,
      tags: data.tags || [],
      fontTags: data.font_tags || [],
      languages: data.languages || [],
      useCases: data.use_cases || [],
      license: parseNull(data.license),
      licenseType: parseNull(data.license_type),
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

    let analysis: any | undefined;
    if (this.analysisUrl) {
      try {
        const ar = await fetch(this.analysisUrl);
        if (ar.ok) analysis = await ar.json();
      } catch {}
    }

    const entries = Object.entries(mapping).slice(0, limit);
    const parseNull = this.parseNull.bind(this);
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
      const preview: any = {
        normalizedName,
        name: (parseNull(data.chinese_name) ||
          parseNull(data.english_name) ||
          parseNull(data.original_name) ||
          parseNull(data.font_family) ||
          normalizedName) as string,
        fontFamily: data.font_family,
        version: data.version,
        fontCategory: data.font_category,
        foundry: parseNull(data.foundry),
        licenseType: parseNull(data.license_type),
        tags: data.tags || [],
        languages: data.languages || [],
        weightsSummary,
      };
      if (analysis && (analysis as Record<string, unknown>)[normalizedName]) {
        preview.analysis = (analysis as Record<string, unknown>)[normalizedName];
      }
      return preview;
    });
  }

  async fetchFontAnalysis(normalizedName: string): Promise<any | undefined> {
    if (!this.analysisUrl) {
      return undefined;
    }

    try {
      const res = await fetch(this.analysisUrl);

      if (!res.ok) {
        return undefined;
      }

      const json = await res.json();

      // JSON 结构是 { summary: {...}, fonts: [{name: '...', children: [...]}] }
      if (!json.fonts || !Array.isArray(json.fonts)) {
        return undefined;
      }

      // 在 fonts 数组中查找 name 等于 normalizedName 的对象
      const fontData = json.fonts.find((font: any) => font.name === normalizedName);

      if (fontData) {
        // 返回第一个 child（通常是 Regular 或默认字重）
        if (fontData.children && fontData.children.length > 0) {
          return fontData.children[0];
        } else {
          return fontData;
        }
      }

      return undefined;
    } catch (error) {
      console.error('[SyncService] Error fetching font analysis:', error);
      return undefined;
    }
  }
}

// 导出单例实例
export const syncService = new SyncService();
