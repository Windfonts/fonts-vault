import { db } from '@/lib/db/client';
import { brands, categories, fonts, type Font, type NewFont } from '@/lib/db/schema';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import {
  fontCreateSchema,
  fontFilterSchema,
  type FontCreateDto,
  type FontFilterDto,
  type FontUpdateDto,
} from './validation';

export interface FontListResult {
  total: number;
  page: number;
  pageTotal: number;
  dataList: Font[];
}

export class FontService {
  /**
   * 获取字体列表（支持分页和筛选）
   */
  async findAll(filters?: Partial<FontFilterDto>): Promise<FontListResult> {
    // 验证和设置默认值
    const validated = filters ? fontFilterSchema.parse(filters) : fontFilterSchema.parse({});
    const { page, size, categoryId, brandId, search, tags, licenseType, sort, order } = validated;

    // 构建查询条件
    const conditions = [];

    if (categoryId) {
      conditions.push(eq(fonts.categoryId, categoryId));
    }

    if (brandId) {
      conditions.push(eq(fonts.brandId, brandId));
    }

    if (search) {
      conditions.push(
        or(
          like(fonts.name, `%${search}%`),
          like(fonts.englishName, `%${search}%`),
          like(fonts.chineseName, `%${search}%`),
          like(fonts.fontFamily, `%${search}%`)
        )
      );
    }

    if (licenseType) {
      conditions.push(eq(fonts.licenseType, licenseType));
    }

    // 状态筛选
    if (validated.status) {
      conditions.push(eq(fonts.status, validated.status));
    }

    // 标签筛选（需要检查JSON数组）
    if (tags && tags.length > 0) {
      // SQLite JSON查询比较复杂，这里简化处理
      // 实际应用中可能需要更复杂的查询逻辑
      const tagConditions = tags.map((tag) => like(fonts.tags, `%${tag}%`));
      conditions.push(or(...tagConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(fonts)
      .where(whereClause);
    const total = Number(countResult[0].count);

    // 排序
    const orderByClause = order === 'asc' ? asc(fonts[sort]) : desc(fonts[sort]);

    // 分页查询
    const offset = (page - 1) * size;
    const dataList = await db
      .select()
      .from(fonts)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(size)
      .offset(offset);

    const pageTotal = Math.ceil(total / size);

    return {
      total,
      page,
      pageTotal,
      dataList,
    };
  }

  /**
   * 获取字体列表（带关联数据，支持分页和筛选）
   */
  async findAllWithRelations(filters?: Partial<FontFilterDto>) {
    // 验证和设置默认值
    const validated = filters ? fontFilterSchema.parse(filters) : fontFilterSchema.parse({});
    const { page, size, categoryId, brandId, search, tags, licenseType, sort, order } = validated;

    // 构建查询条件
    const conditions = [];

    if (categoryId) {
      conditions.push(eq(fonts.categoryId, categoryId));
    }

    if (brandId) {
      conditions.push(eq(fonts.brandId, brandId));
    }

    if (search) {
      conditions.push(
        or(
          like(fonts.name, `%${search}%`),
          like(fonts.englishName, `%${search}%`),
          like(fonts.chineseName, `%${search}%`),
          like(fonts.fontFamily, `%${search}%`)
        )
      );
    }

    if (licenseType) {
      conditions.push(eq(fonts.licenseType, licenseType));
    }

    // 状态筛选
    if (validated.status) {
      conditions.push(eq(fonts.status, validated.status));
    }

    // 风格标签筛选（使用 fontTags 字段）
    if (tags && tags.length > 0) {
      const tagConditions = tags.map((tag) => like(fonts.fontTags, `%${tag}%`));
      conditions.push(or(...tagConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 排序
    const orderByClause = order === 'asc' ? asc(fonts[sort]) : desc(fonts[sort]);

    // 并行执行 COUNT 和数据查询
    const offset = (page - 1) * size;

    const [countResult, result] = await Promise.all([
      // 获取总数
      db
        .select({ count: sql<number>`count(*)` })
        .from(fonts)
        .where(whereClause),
      // 分页查询（带关联）- 列表页不需要 weights 和 copyright 等大字段
      db
        .select({
          font: fonts,
          brand: brands,
          category: categories,
        })
        .from(fonts)
        .leftJoin(brands, eq(fonts.brandId, brands.id))
        .leftJoin(categories, eq(fonts.categoryId, categories.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(size)
        .offset(offset),
    ]);

    const total = Number(countResult[0].count);
    const pageTotal = Math.ceil(total / size);

    // 映射结果，排除大字段但保留必要信息
    const dataList = result.map((row) => {
      const { copyright: _copyright, ...fontData } = row.font;
      void _copyright;

      // 简化 weights 数据，只保留字重名称
      let simplifiedWeights: Record<string, { weight_name: string; font_weight: number }> = {};
      if (fontData.weights) {
        const weightsObj = fontData.weights;
        simplifiedWeights = Object.keys(weightsObj).reduce(
          (acc, key) => {
            acc[key] = {
              weight_name: weightsObj[key].weight_name,
              font_weight: weightsObj[key].font_weight,
            };
            return acc;
          },
          {} as Record<string, { weight_name: string; font_weight: number }>
        );
      }

      return {
        ...fontData,
        weights: simplifiedWeights,
        brand: row.brand,
        category: row.category,
      };
    });

    return {
      total,
      page,
      pageTotal,
      dataList,
    };
  }

  /**
   * 根据ID获取字体详情
   */
  async findById(id: string): Promise<Font | undefined> {
    const result = await db.select().from(fonts).where(eq(fonts.id, id)).limit(1);
    return result[0];
  }

  /**
   * 根据ID获取字体详情（带关联数据）
   */
  async findByIdWithRelations(id: string) {
    const result = await db
      .select({
        font: fonts,
        brand: brands,
        category: categories,
      })
      .from(fonts)
      .leftJoin(brands, eq(fonts.brandId, brands.id))
      .leftJoin(categories, eq(fonts.categoryId, categories.id))
      .where(eq(fonts.id, id))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return {
      ...result[0].font,
      brand: result[0].brand,
      category: result[0].category,
    };
  }

  /**
   * 根据normalizedName获取字体
   */
  async findByNormalizedName(normalizedName: string): Promise<Font | undefined> {
    const normalized = normalizedName.trim().toLowerCase();
    const result = await db
      .select()
      .from(fonts)
      .where(sql`lower(${fonts.normalizedName}) = ${normalized}`)
      .limit(1);
    return result[0];
  }

  /**
   * 根据normalizedName获取字体详情（带关联数据）
   */
  async findByNormalizedNameWithRelations(normalizedName: string) {
    const normalized = normalizedName.trim().toLowerCase();
    const result = await db
      .select({
        font: fonts,
        brand: brands,
        category: categories,
      })
      .from(fonts)
      .leftJoin(brands, eq(fonts.brandId, brands.id))
      .leftJoin(categories, eq(fonts.categoryId, categories.id))
      .where(sql`lower(${fonts.normalizedName}) = ${normalized}`)
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return {
      ...result[0].font,
      brand: result[0].brand,
      category: result[0].category,
    };
  }

  /**
   * 根据fontFamily获取字体
   */
  async findByFontFamily(fontFamily: string): Promise<Font[]> {
    const normalizedFamily = fontFamily.trim().toLowerCase();
    return await db
      .select()
      .from(fonts)
      .where(sql`lower(${fonts.fontFamily}) = ${normalizedFamily}`);
  }

  /**
   * 搜索字体（名称、品牌、标签）
   */
  async search(query: string): Promise<Font[]> {
    return await db
      .select()
      .from(fonts)
      .where(
        or(
          like(fonts.name, `%${query}%`),
          like(fonts.englishName, `%${query}%`),
          like(fonts.chineseName, `%${query}%`),
          like(fonts.fontFamily, `%${query}%`),
          like(fonts.tags, `%${query}%`),
          like(fonts.fontTags, `%${query}%`)
        )
      )
      .orderBy(desc(fonts.viewCount));
  }

  /**
   * 创建字体
   */
  async create(data: Partial<FontCreateDto>): Promise<Font> {
    // 验证数据
    const validated = fontCreateSchema.parse(data);

    // 检查normalizedName唯一性
    const existing = await this.findByNormalizedName(validated.normalizedName);
    if (existing) {
      throw new Error('字体标准化名称已存在');
    }

    // 验证关联的分类和品牌是否存在
    if (validated.categoryId) {
      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, validated.categoryId))
        .limit(1);
      if (category.length === 0) {
        throw new Error('指定的分类不存在');
      }
    }

    if (validated.brandId) {
      const brand = await db.select().from(brands).where(eq(brands.id, validated.brandId)).limit(1);
      if (brand.length === 0) {
        throw new Error('指定的品牌不存在');
      }
    }

    const newFont: NewFont = {
      ...validated,
      viewCount: 0,
      downloadCount: 0,
      apiCallCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(fonts).values(newFont).returning();
    return result[0];
  }

  /**
   * 更新字体
   */
  async update(id: string, data: Partial<FontUpdateDto>): Promise<Font> {
    // 检查字体是否存在
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('字体不存在');
    }

    // 如果更新normalizedName，检查唯一性
    if (data.normalizedName && data.normalizedName !== existing.normalizedName) {
      const duplicate = await this.findByNormalizedName(data.normalizedName);
      if (duplicate) {
        throw new Error('字体标准化名称已存在');
      }
    }

    // 验证关联的分类和品牌是否存在
    if (data.categoryId) {
      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, data.categoryId))
        .limit(1);
      if (category.length === 0) {
        throw new Error('指定的分类不存在');
      }
    }

    if (data.brandId) {
      const brand = await db.select().from(brands).where(eq(brands.id, data.brandId)).limit(1);
      if (brand.length === 0) {
        throw new Error('指定的品牌不存在');
      }
    }

    const result = await db
      .update(fonts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(fonts.id, id))
      .returning();

    return result[0];
  }

  /**
   * 删除字体
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('字体不存在');
    }

    await db.delete(fonts).where(eq(fonts.id, id));
  }

  /**
   * 增加浏览次数
   */
  async incrementViewCount(id: string): Promise<void> {
    await db
      .update(fonts)
      .set({
        viewCount: sql`${fonts.viewCount} + 1`,
      })
      .where(eq(fonts.id, id));
  }

  /**
   * 增加下载次数
   */
  async incrementDownloadCount(id: string): Promise<void> {
    await db
      .update(fonts)
      .set({
        downloadCount: sql`${fonts.downloadCount} + 1`,
      })
      .where(eq(fonts.id, id));
  }

  /**
   * 增加API调用次数
   */
  async incrementApiCallCount(id: string): Promise<void> {
    await db
      .update(fonts)
      .set({
        apiCallCount: sql`${fonts.apiCallCount} + 1`,
      })
      .where(eq(fonts.id, id));
  }

  /**
   * 获取热门字体
   */
  async getPopularFonts(limit: number = 10): Promise<Font[]> {
    return await db.select().from(fonts).orderBy(desc(fonts.viewCount)).limit(limit);
  }

  /**
   * 获取热门字体（带关联数据）
   */
  async getPopularFontsWithRelations(limit: number = 10) {
    const result = await db
      .select({
        font: fonts,
        brand: brands,
        category: categories,
      })
      .from(fonts)
      .leftJoin(brands, eq(fonts.brandId, brands.id))
      .leftJoin(categories, eq(fonts.categoryId, categories.id))
      .where(eq(fonts.status, 'published'))
      .orderBy(desc(fonts.viewCount))
      .limit(limit);

    return result.map((row) => ({
      ...row.font,
      brand: row.brand,
      category: row.category,
    }));
  }

  /**
   * 获取最新字体
   */
  async getLatestFonts(limit: number = 10): Promise<Font[]> {
    return await db.select().from(fonts).orderBy(desc(fonts.createdAt)).limit(limit);
  }

  /**
   * 获取最新字体（带关联数据）
   */
  async getLatestFontsWithRelations(limit: number = 10) {
    const result = await db
      .select({
        font: fonts,
        brand: brands,
        category: categories,
      })
      .from(fonts)
      .leftJoin(brands, eq(fonts.brandId, brands.id))
      .leftJoin(categories, eq(fonts.categoryId, categories.id))
      .where(eq(fonts.status, 'published'))
      .orderBy(desc(fonts.createdAt))
      .limit(limit);

    return result.map((row) => ({
      ...row.font,
      brand: row.brand,
      category: row.category,
    }));
  }

  /**
   * 根据分类获取字体
   */
  async findByCategory(categoryId: string): Promise<Font[]> {
    return await db.select().from(fonts).where(eq(fonts.categoryId, categoryId));
  }

  /**
   * 根据品牌获取字体
   */
  async findByBrand(brandId: string): Promise<Font[]> {
    return await db.select().from(fonts).where(eq(fonts.brandId, brandId));
  }

  async getAvailableTags(): Promise<string[]> {
    const rows = await db.select({ tags: fonts.tags }).from(fonts);
    const all = rows.flatMap((r) => r.tags || []);
    return Array.from(new Set(all)).sort();
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalFonts: number;
    totalBrands: number;
    totalCategories: number;
    totalViews: number;
    totalDownloads: number;
  }> {
    const fontCount = await db.select({ count: sql<number>`count(*)` }).from(fonts);
    const brandCount = await db.select({ count: sql<number>`count(*)` }).from(brands);
    const categoryCount = await db.select({ count: sql<number>`count(*)` }).from(categories);

    const viewSum = await db.select({ sum: sql<number>`sum(${fonts.viewCount})` }).from(fonts);
    const downloadSum = await db
      .select({ sum: sql<number>`sum(${fonts.downloadCount})` })
      .from(fonts);

    return {
      totalFonts: Number(fontCount[0].count),
      totalBrands: Number(brandCount[0].count),
      totalCategories: Number(categoryCount[0].count),
      totalViews: Number(viewSum[0].sum || 0),
      totalDownloads: Number(downloadSum[0].sum || 0),
    };
  }
}

// 导出单例实例
export const fontService = new FontService();
