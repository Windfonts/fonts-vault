import { z } from 'zod';

// Brand validation schemas
export const brandCreateSchema = z.object({
  name: z.string().min(1, '厂商名称不能为空').max(255, '厂商名称过长'),
  slug: z.string().min(1, 'Slug不能为空').max(255, 'Slug过长'),
  logoUrl: z.string().url('Logo URL格式不正确').optional(),
  bannerUrl: z.string().url('Banner URL格式不正确').optional(),
  description: z.string().optional(),
  website: z.string().url('网站URL格式不正确').optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional(),
      github: z.string().url().optional(),
      weibo: z.string().url().optional(),
    })
    .optional(),
  status: z.enum(['draft', 'published', 'offline']).default('published'),
});

export const brandUpdateSchema = brandCreateSchema.partial();

// Category validation schemas
export const categoryCreateSchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(255, '分类名称过长'),
  slug: z.string().min(1, 'Slug不能为空').max(255, 'Slug过长'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// Font validation schemas
export const fontWeightVersionSchema = z.object({
  file: z.string(),
  char_count: z.number(),
  glyph_count: z.number(),
  subfamily_name: z.string(),
  typographic_subfamily: z.string().optional().default(''),
});

export const fontWeightSchema = z.object({
  font_family: z.string(),
  weight_name: z.string(),
  font_weight: z.number(),
  versions: z.record(fontWeightVersionSchema),
});

export const fontCreateSchema = z.object({
  normalizedName: z.string().min(1, '标准化名称不能为空'),
  name: z.string().min(1, '字体名称不能为空').max(255, '字体名称过长'),
  englishName: z.string().optional(),
  chineseName: z.string().optional(),
  fontFamily: z.string().min(1, 'Font Family不能为空'),
  originalName: z.string().optional(),
  weights: z.record(fontWeightSchema),
  version: z.string().min(1, '版本号不能为空'),
  copyright: z.string().optional(),
  description: z.string().optional(),
  designer: z.string().optional(),
  foundry: z.string().optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  category: z.string().optional(),
  fontCategory: z.string().nullable().optional(),
  style: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional().default([]),
  fontTags: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default([]),
  useCases: z.array(z.string()).optional().default([]),
  license: z.string().optional(),
  licenseType: z.string().optional(),
  price: z.number().positive().optional(),
  purchaseUrl: z.string().url().optional(),
  licenseDescription: z.string().optional(),
  ossPath: z.string().min(1, 'OSS路径不能为空'),
  status: z.enum(['draft', 'published', 'offline']).optional().default('published'),
});

export const fontUpdateSchema = fontCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const fontFilterSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  size: z.number().int().positive().max(100).optional().default(20),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  licenseType: z.string().optional(),
  status: z.enum(['draft', 'published', 'offline']).optional(),
  sort: z.enum(['name', 'createdAt', 'viewCount', 'downloadCount']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// CSS API validation
export const cssApiSchema = z.object({
  family: z.string().min(1, 'family参数不能为空'), // fontFamily 或 normalizedName 都可以
  weight: z.string().optional().default('regular'),
  version: z.enum(['en', 'zh', 'zh-common', 'full']).optional().default('full'),
  /** 谱系/简繁补全：第二款 family；服务端裁切 unicode-range 只留主款缺口 */
  fallback: z.string().min(1).optional(),
  /** 补全款字重名；缺省与主款同名，再按 font_weight 数字对齐 */
  fallbackWeight: z.string().min(1).optional(),
  /**
   * 简繁兄弟补全：off|auto|sc|tc。
   * 有配对且未传 fallback 时，展开为第二款并走缺口裁切；不做码点转换。
   */
  localeFallback: z.enum(['off', 'auto', 'sc', 'tc']).optional(),
});

// Sync validation
export const syncRequestSchema = z.object({
  force: z.boolean().default(false),
});

/** 项目烘焙清单：写入 data/projects/{slug}.json，由 GET /p/{slug}/index.css 展开 */
export const projectFontSchema = z.object({
  family: z.string().min(1),
  weights: z.array(z.string().min(1)).min(1).default(['regular']),
  subset: z.enum(['en', 'zh', 'zh-common', 'full']).default('full'),
  fallback: z.string().min(1).optional(),
  fallbackWeight: z.string().min(1).optional(),
  localeFallback: z.enum(['off', 'auto', 'sc', 'tc']).optional(),
});

export const projectManifestSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 仅小写字母数字与连字符'),
  name: z.string().min(1).max(120).optional(),
  version: z.number().int().positive().default(1),
  publishedAt: z.string().optional(),
  display: z.enum(['auto', 'block', 'swap', 'fallback', 'optional']).optional(),
  domains: z.array(z.string().min(1)).default([]),
  fonts: z.array(projectFontSchema).min(1),
  /** 发布方 API key 哈希；非空时覆盖须同钥 */
  ownerKeyHash: z.string().min(8).nullable().optional(),
});

// Export types
export type BrandCreateDto = z.input<typeof brandCreateSchema>;
export type BrandUpdateDto = z.infer<typeof brandUpdateSchema>;
export type CategoryCreateDto = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateDto = z.infer<typeof categoryUpdateSchema>;
export type FontCreateDto = z.input<typeof fontCreateSchema>;
export type FontUpdateDto = z.infer<typeof fontUpdateSchema>;
export type FontFilterDto = z.input<typeof fontFilterSchema>;
export type CssApiDto = z.infer<typeof cssApiSchema>;
export type SyncRequestDto = z.infer<typeof syncRequestSchema>;
export type ProjectManifest = z.infer<typeof projectManifestSchema>;
export type ProjectManifestDto = z.input<typeof projectManifestSchema>;
