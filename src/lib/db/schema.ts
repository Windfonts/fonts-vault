import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// brands 表
export const brands = sqliteTable('brands', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  description: text('description'),
  website: text('website'),
  socialLinks: text('social_links', { mode: 'json' }).$type<{
    twitter?: string;
    github?: string;
    weibo?: string;
  }>(),
  status: text('status', { enum: ['draft', 'published', 'offline'] })
    .notNull()
    .default('published'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// categories 表
export const categories = sqliteTable('categories', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// styles 表（字体风格标签）
export const styles = sqliteTable('styles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// fonts 表
export const fonts = sqliteTable(
  'fonts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // 基本信息（来自 JSON）
    normalizedName: text('normalized_name').notNull().unique(), // JSON 中的 key
    name: text('name').notNull(), // 显示名称（优先中文名）
    englishName: text('english_name'),
    chineseName: text('chinese_name'),
    fontFamily: text('font_family').notNull(), // WF-Qtxtt
    originalName: text('original_name'),

    // 字重信息（JSON 格式存储）
    weights: text('weights', { mode: 'json' })
      .$type<{
        [key: string]: {
          font_family: string;
          weight_name: string;
          font_weight: number;
          versions: {
            [key: string]: {
              file: string;
              char_count: number;
              glyph_count: number;
              subfamily_name: string;
              typographic_subfamily: string;
            };
          };
        };
      }>()
      .notNull(),

    // 版本和元数据
    version: text('version').notNull(),
    copyright: text('copyright'),
    description: text('description'),
    designer: text('designer'),
    foundry: text('foundry'), // 字体厂商
    releaseYear: integer('release_year'),

    // 分类信息
    category: text('category'), // 原始分类
    fontCategory: text('font_category'), // 字体分类（如：无衬线字体、手写体）
    style: text('style'),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    brandId: text('brand_id').references(() => brands.id, {
      onDelete: 'set null',
    }),

    // 标签和语言
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    fontTags: text('font_tags', { mode: 'json' }).$type<string[]>(),
    languages: text('languages', { mode: 'json' }).$type<string[]>(),
    useCases: text('use_cases', { mode: 'json' }).$type<string[]>(),

    // 授权信息
    license: text('license'),
    licenseType: text('license_type'), // 免费商用、个人免费等
    price: real('price'),
    purchaseUrl: text('purchase_url'),
    licenseDescription: text('license_description'),

    // OSS 路径信息（基于 normalized_name 构建）
    ossPath: text('oss_path').notNull(), // /fonts-packages/{normalized_name}

    // 统计信息
    viewCount: integer('view_count').notNull().default(0),
    downloadCount: integer('download_count').notNull().default(0),
    apiCallCount: integer('api_call_count').notNull().default(0),

    // 状态控制
    status: text('status', { enum: ['draft', 'published', 'offline'] })
      .notNull()
      .default('published'),

    // 时间戳
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    nameIdx: index('fonts_name_idx').on(table.name),
    familyIdx: index('fonts_family_idx').on(table.fontFamily),
    categoryIdx: index('fonts_category_idx').on(table.categoryId),
    brandIdx: index('fonts_brand_idx').on(table.brandId),
  })
);

// 导出类型
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;

export type Font = typeof fonts.$inferSelect;
export type NewFont = typeof fonts.$inferInsert;
