import { db } from '@/lib/db/client';
import { brands, fonts, type Brand, type NewBrand } from '@/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';
import {
  brandCreateSchema,
  brandUpdateSchema,
  type BrandCreateDto,
  type BrandUpdateDto,
} from './validation';

export class BrandService {
  /**
   * 获取所有品牌列表
   */
  async findAll(): Promise<Brand[]> {
    return await db.select().from(brands).orderBy(brands.name);
  }

  /**
   * 根据ID获取品牌
   */
  async findById(id: string): Promise<Brand | undefined> {
    const result = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
    return result[0];
  }

  /**
   * 根据slug获取品牌
   */
  async findBySlug(slug: string): Promise<Brand | undefined> {
    const result = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
    return result[0];
  }

  /**
   * 根据名称获取品牌
   */
  async findByName(name: string): Promise<Brand | undefined> {
    const result = await db.select().from(brands).where(eq(brands.name, name)).limit(1);
    return result[0];
  }

  /**
   * 搜索品牌
   */
  async search(query: string): Promise<Brand[]> {
    return await db
      .select()
      .from(brands)
      .where(or(like(brands.name, `%${query}%`), like(brands.slug, `%${query}%`)))
      .orderBy(brands.name);
  }

  /**
   * 创建品牌
   */
  async create(data: BrandCreateDto): Promise<Brand> {
    // 验证数据
    const validated = brandCreateSchema.parse(data);

    // 检查名称唯一性
    const existing = await this.findByName(validated.name);
    if (existing) {
      throw new Error('品牌名称已存在');
    }

    // 检查slug唯一性
    const existingSlug = await this.findBySlug(validated.slug);
    if (existingSlug) {
      throw new Error('品牌Slug已存在');
    }

    const newBrand: NewBrand = {
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(brands).values(newBrand).returning();
    return result[0];
  }

  /**
   * 更新品牌
   */
  async update(id: string, data: BrandUpdateDto): Promise<Brand> {
    // 验证数据
    const validated = brandUpdateSchema.parse(data);

    // 检查品牌是否存在
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('品牌不存在');
    }

    // 如果更新名称，检查唯一性
    if (validated.name && validated.name !== existing.name) {
      const duplicate = await this.findByName(validated.name);
      if (duplicate) {
        throw new Error('品牌名称已存在');
      }
    }

    // 如果更新slug，检查唯一性
    if (validated.slug && validated.slug !== existing.slug) {
      const duplicateSlug = await this.findBySlug(validated.slug);
      if (duplicateSlug) {
        throw new Error('品牌Slug已存在');
      }
    }

    const result = await db
      .update(brands)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();

    return result[0];
  }

  /**
   * 删除品牌
   */
  async delete(id: string): Promise<void> {
    // 检查品牌是否存在
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('品牌不存在');
    }

    // 检查是否有关联的字体
    const associatedFonts = await db.select().from(fonts).where(eq(fonts.brandId, id)).limit(1);
    if (associatedFonts.length > 0) {
      throw new Error('该品牌下有关联的字体，无法删除。请先解除关联或删除相关字体。');
    }

    await db.delete(brands).where(eq(brands.id, id));
  }

  /**
   * 检查品牌是否有关联的字体
   */
  async hasAssociatedFonts(id: string): Promise<boolean> {
    const result = await db.select().from(fonts).where(eq(fonts.brandId, id)).limit(1);
    return result.length > 0;
  }
}

// 导出单例实例
export const brandService = new BrandService();
