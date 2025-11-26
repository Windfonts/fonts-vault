import { db } from '@/lib/db/client';
import { categories, fonts, type Category, type NewCategory } from '@/lib/db/schema';
import { eq, like, or, asc } from 'drizzle-orm';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateDto,
  type CategoryUpdateDto,
} from './validation';

export class CategoryService {
  /**
   * 获取所有分类列表（按order排序）
   */
  async findAll(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.order), asc(categories.name));
  }

  /**
   * 根据ID获取分类
   */
  async findById(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  /**
   * 根据slug获取分类
   */
  async findBySlug(slug: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return result[0];
  }

  /**
   * 根据名称获取分类
   */
  async findByName(name: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
    return result[0];
  }

  /**
   * 搜索分类
   */
  async search(query: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(or(like(categories.name, `%${query}%`), like(categories.slug, `%${query}%`)))
      .orderBy(asc(categories.order), asc(categories.name));
  }

  /**
   * 创建分类
   */
  async create(data: CategoryCreateDto): Promise<Category> {
    // 验证数据
    const validated = categoryCreateSchema.parse(data);

    // 检查名称唯一性
    const existing = await this.findByName(validated.name);
    if (existing) {
      throw new Error('分类名称已存在');
    }

    // 检查slug唯一性
    const existingSlug = await this.findBySlug(validated.slug);
    if (existingSlug) {
      throw new Error('分类Slug已存在');
    }

    const newCategory: NewCategory = {
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(categories).values(newCategory).returning();
    return result[0];
  }

  /**
   * 更新分类
   */
  async update(id: string, data: CategoryUpdateDto): Promise<Category> {
    // 验证数据
    const validated = categoryUpdateSchema.parse(data);

    // 检查分类是否存在
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('分类不存在');
    }

    // 如果更新名称，检查唯一性
    if (validated.name && validated.name !== existing.name) {
      const duplicate = await this.findByName(validated.name);
      if (duplicate) {
        throw new Error('分类名称已存在');
      }
    }

    // 如果更新slug，检查唯一性
    if (validated.slug && validated.slug !== existing.slug) {
      const duplicateSlug = await this.findBySlug(validated.slug);
      if (duplicateSlug) {
        throw new Error('分类Slug已存在');
      }
    }

    const result = await db
      .update(categories)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return result[0];
  }

  /**
   * 删除分类
   */
  async delete(id: string): Promise<void> {
    // 检查分类是否存在
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('分类不存在');
    }

    // 检查是否有关联的字体
    const associatedFonts = await db.select().from(fonts).where(eq(fonts.categoryId, id)).limit(1);
    if (associatedFonts.length > 0) {
      throw new Error('该分类下有关联的字体，无法删除。请先将字体重新分类或删除相关字体。');
    }

    await db.delete(categories).where(eq(categories.id, id));
  }

  /**
   * 检查分类是否有关联的字体
   */
  async hasAssociatedFonts(id: string): Promise<boolean> {
    const result = await db.select().from(fonts).where(eq(fonts.categoryId, id)).limit(1);
    return result.length > 0;
  }

  /**
   * 更新分类排序
   */
  async updateOrder(id: string, order: number): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('分类不存在');
    }

    const result = await db
      .update(categories)
      .set({
        order,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return result[0];
  }
}

// 导出单例实例
export const categoryService = new CategoryService();
