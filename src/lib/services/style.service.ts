import { db } from '@/lib/db';
import { styles, type NewStyle, type Style } from '@/lib/db/schema';
import { logger } from '@/lib/logger';
import { asc, eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

/**
 * 风格服务
 */
class StyleService {
  /**
   * 获取所有风格
   */
  async findAll(): Promise<Style[]> {
    return await db.select().from(styles).orderBy(asc(styles.order), asc(styles.name));
  }

  /**
   * 根据ID获取风格
   */
  async findById(id: string): Promise<Style | undefined> {
    const result = await db.select().from(styles).where(eq(styles.id, id)).limit(1);
    return result[0];
  }

  /**
   * 根据slug获取风格
   */
  async findBySlug(slug: string): Promise<Style | undefined> {
    const result = await db.select().from(styles).where(eq(styles.slug, slug)).limit(1);
    return result[0];
  }

  /**
   * 根据名称获取风格
   */
  async findByName(name: string): Promise<Style | undefined> {
    const result = await db.select().from(styles).where(eq(styles.name, name)).limit(1);
    return result[0];
  }

  /**
   * 创建风格
   */
  async create(data: Omit<NewStyle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Style> {
    // 检查名称是否已存在
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new Error(`风格 "${data.name}" 已存在`);
    }

    // 检查 slug 是否已存在
    const existingSlug = await this.findBySlug(data.slug);
    if (existingSlug) {
      throw new Error(`Slug "${data.slug}" 已存在`);
    }

    const newStyle: NewStyle = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(styles).values(newStyle).returning();
    return result[0];
  }

  /**
   * 更新风格
   */
  async update(id: string, data: Partial<Omit<NewStyle, 'id' | 'createdAt'>>): Promise<Style> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('风格不存在');
    }

    // 如果更新名称，检查是否与其他风格重复
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.findByName(data.name);
      if (duplicate) {
        throw new Error(`风格 "${data.name}" 已存在`);
      }
    }

    // 如果更新 slug，检查是否与其他风格重复
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.findBySlug(data.slug);
      if (duplicate) {
        throw new Error(`Slug "${data.slug}" 已存在`);
      }
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db.update(styles).set(updateData).where(eq(styles.id, id)).returning();

    return result[0];
  }

  /**
   * 删除风格
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('风格不存在');
    }

    await db.delete(styles).where(eq(styles.id, id));
  }

  /**
   * 从 category.json 初始化风格数据
   */
  async initializeFromJson(): Promise<void> {
    try {
      // 读取 category.json
      const categoryDataPath = path.join(process.cwd(), 'data', 'category.json');
      const categoryDataContent = await fs.readFile(categoryDataPath, 'utf-8');
      const categoryData = JSON.parse(categoryDataContent);

      const tags = categoryData.tags || [];

      // 获取现有风格
      const existingStyles = await this.findAll();
      const existingNames = new Set(existingStyles.map((s) => s.name));

      // 添加新风格
      let order = existingStyles.length;
      for (const tag of tags) {
        if (!existingNames.has(tag)) {
          await this.create({
            name: tag,
            slug: this.generateSlug(tag),
            order: order++,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize styles from JSON', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 生成 slug
   */
  private generateSlug(name: string): string {
    // 简单的 slug 生成：移除特殊字符，转小写
    return name
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * 获取风格名称列表（用于筛选）
   */
  async getStyleNames(): Promise<string[]> {
    const allStyles = await this.findAll();
    return allStyles.map((s) => s.name);
  }
}

export const styleService = new StyleService();
