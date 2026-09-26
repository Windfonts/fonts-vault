import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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

// api_plans 表（API 调用套餐）
export const apiPlans = sqliteTable(
  'api_plans',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    dailyQuota: integer('daily_quota').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slugIdx: uniqueIndex('api_plans_slug_unique').on(table.slug),
    activeIdx: index('api_plans_active_idx').on(table.isActive),
  })
);

// api_keys 表（API 密钥）
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    checksum: text('checksum').notNull(),
    planId: text('plan_id').references(() => apiPlans.id, { onDelete: 'set null' }),
    ownerEmail: text('owner_email'),
    status: text('status', { enum: ['active', 'revoked'] })
      .notNull()
      .default('active'),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    hashIdx: uniqueIndex('api_keys_hash_unique').on(table.keyHash),
    statusIdx: index('api_keys_status_idx').on(table.status),
    planIdx: index('api_keys_plan_idx').on(table.planId),
    ownerIdx: index('api_keys_owner_idx').on(table.ownerEmail),
  })
);

export const apiDomainBlacklist = sqliteTable(
  'api_domain_blacklist',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    domain: text('domain').notNull(),
    reason: text('reason'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    domainIdx: uniqueIndex('api_domain_blacklist_domain_unique').on(table.domain),
    activeIdx: index('api_domain_blacklist_active_idx').on(table.isActive),
  })
);

export const apiDomainWhitelist = sqliteTable(
  'api_domain_whitelist',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    domain: text('domain').notNull(),
    note: text('note'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    domainIdx: uniqueIndex('api_domain_whitelist_domain_unique').on(table.domain),
    activeIdx: index('api_domain_whitelist_active_idx').on(table.isActive),
  })
);

export const apiDomainWhitelistAudit = sqliteTable(
  'api_domain_whitelist_audit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    whitelistId: text('whitelist_id'),
    domain: text('domain'),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    before: text('before'),
    after: text('after'),
  },
  (table) => ({
    createdAtIdx: index('api_domain_whitelist_audit_created_at_idx').on(table.createdAt),
    actionIdx: index('api_domain_whitelist_audit_action_idx').on(table.action),
    domainIdx: index('api_domain_whitelist_audit_domain_idx').on(table.domain),
    actorIdx: index('api_domain_whitelist_audit_actor_idx').on(table.actorEmail),
  })
);

export const apiIpWhitelist = sqliteTable(
  'api_ip_whitelist',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ip: text('ip').notNull(),
    note: text('note'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    ipIdx: uniqueIndex('api_ip_whitelist_ip_unique').on(table.ip),
    activeIdx: index('api_ip_whitelist_active_idx').on(table.isActive),
  })
);

export const apiIpWhitelistAudit = sqliteTable(
  'api_ip_whitelist_audit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    whitelistId: text('whitelist_id'),
    ip: text('ip'),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    before: text('before'),
    after: text('after'),
  },
  (table) => ({
    createdAtIdx: index('api_ip_whitelist_audit_created_at_idx').on(table.createdAt),
    actionIdx: index('api_ip_whitelist_audit_action_idx').on(table.action),
    ipIdx: index('api_ip_whitelist_audit_ip_idx').on(table.ip),
    actorIdx: index('api_ip_whitelist_audit_actor_idx').on(table.actorEmail),
  })
);

// api_domain_blacklist 表（域名黑名单）
export const apiWhitelist = sqliteTable(
  'api_whitelist',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text('type', { enum: ['domain', 'ip'] }).notNull(),
    value: text('value').notNull(),
    note: text('note'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    valueIdx: uniqueIndex('api_whitelist_value_unique').on(table.value),
    activeIdx: index('api_whitelist_active_idx').on(table.isActive),
    typeIdx: index('api_whitelist_type_idx').on(table.type),
  })
);

export const apiWhitelistAudit = sqliteTable(
  'api_whitelist_audit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    whitelistId: text('whitelist_id'),
    type: text('type', { enum: ['domain', 'ip'] }),
    value: text('value'),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    before: text('before'),
    after: text('after'),
  },
  (table) => ({
    createdAtIdx: index('api_whitelist_audit_created_at_idx').on(table.createdAt),
    actionIdx: index('api_whitelist_audit_action_idx').on(table.action),
    valueIdx: index('api_whitelist_audit_value_idx').on(table.value),
    actorIdx: index('api_whitelist_audit_actor_idx').on(table.actorEmail),
  })
);

export const apiBlacklist = sqliteTable(
  'api_blacklist',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text('type', { enum: ['domain', 'ip'] }).notNull(),
    value: text('value').notNull(),
    reason: text('reason'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    valueIdx: uniqueIndex('api_blacklist_value_unique').on(table.value),
    activeIdx: index('api_blacklist_active_idx').on(table.isActive),
    typeIdx: index('api_blacklist_type_idx').on(table.type),
  })
);

export const apiBlacklistAudit = sqliteTable(
  'api_blacklist_audit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    blacklistId: text('blacklist_id'),
    type: text('type', { enum: ['domain', 'ip'] }),
    value: text('value'),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    before: text('before'),
    after: text('after'),
  },
  (table) => ({
    createdAtIdx: index('api_blacklist_audit_created_at_idx').on(table.createdAt),
    actionIdx: index('api_blacklist_audit_action_idx').on(table.action),
    valueIdx: index('api_blacklist_audit_value_idx').on(table.value),
    actorIdx: index('api_blacklist_audit_actor_idx').on(table.actorEmail),
  })
);

export const securitySwitches = sqliteTable(
  'security_switches',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text('key').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    keyIdx: uniqueIndex('security_switches_key_unique').on(table.key),
    enabledIdx: index('security_switches_enabled_idx').on(table.enabled),
  })
);

export const securitySwitchesAudit = sqliteTable(
  'security_switches_audit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    switchKey: text('switch_key'),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    before: text('before'),
    after: text('after'),
  },
  (table) => ({
    createdAtIdx: index('security_switches_audit_created_at_idx').on(table.createdAt),
    actionIdx: index('security_switches_audit_action_idx').on(table.action),
    keyIdx: index('security_switches_audit_switch_key_idx').on(table.switchKey),
    actorIdx: index('security_switches_audit_actor_idx').on(table.actorEmail),
  })
);

// api_usage_daily 表（按天计数的调用量，用于限流）
export const apiUsageDaily = sqliteTable(
  'api_usage_daily',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    day: text('day').notNull(),
    subject: text('subject').notNull(),
    keyId: text('key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
    domain: text('domain').notNull(),
    ip: text('ip'),
    count: integer('count').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    byDayIdx: index('api_usage_daily_day_idx').on(table.day),
    bySubjectIdx: index('api_usage_daily_subject_idx').on(table.subject),
    byKeyIdx: index('api_usage_daily_key_idx').on(table.keyId),
    byDomainIdx: index('api_usage_daily_domain_idx').on(table.domain),
    uniqueSubjectDayDomainIpIdx: uniqueIndex('api_usage_daily_subject_day_domain_ip_unique').on(
      table.subject,
      table.day,
      table.domain,
      table.ip
    ),
  })
);

export const apiUsageWindow = sqliteTable(
  'api_usage_window',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    window: text('window').notNull(),
    subject: text('subject').notNull(),
    domain: text('domain').notNull(),
    count: integer('count').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    windowIdx: index('api_usage_window_window_idx').on(table.window),
    subjectIdx: index('api_usage_window_subject_idx').on(table.subject),
    domainIdx: index('api_usage_window_domain_idx').on(table.domain),
    uniqueSubjectWindowDomainIdx: uniqueIndex('api_usage_window_subject_window_domain_unique').on(
      table.subject,
      table.window,
      table.domain
    ),
  })
);

/** CSS 投递明细：按天×域名×字体记请求与响应字节（控制台用量） */
export const apiUsageDelivery = sqliteTable(
  'api_usage_delivery',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    day: text('day').notNull(),
    subject: text('subject').notNull(),
    keyId: text('key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
    domain: text('domain').notNull(),
    family: text('family').notNull(),
    count: integer('count').notNull().default(0),
    bytes: integer('bytes').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    byDayIdx: index('api_usage_delivery_day_idx').on(table.day),
    bySubjectIdx: index('api_usage_delivery_subject_idx').on(table.subject),
    byDomainIdx: index('api_usage_delivery_domain_idx').on(table.domain),
    byFamilyIdx: index('api_usage_delivery_family_idx').on(table.family),
    uniqueSubjectDayDomainFamilyIdx: uniqueIndex(
      'api_usage_delivery_subject_day_domain_family_unique'
    ).on(table.subject, table.day, table.domain, table.family),
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

export type ApiPlan = typeof apiPlans.$inferSelect;
export type NewApiPlan = typeof apiPlans.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type ApiDomainBlacklist = typeof apiDomainBlacklist.$inferSelect;
export type NewApiDomainBlacklist = typeof apiDomainBlacklist.$inferInsert;

export type ApiDomainWhitelist = typeof apiDomainWhitelist.$inferSelect;
export type NewApiDomainWhitelist = typeof apiDomainWhitelist.$inferInsert;

export type ApiDomainWhitelistAudit = typeof apiDomainWhitelistAudit.$inferSelect;
export type NewApiDomainWhitelistAudit = typeof apiDomainWhitelistAudit.$inferInsert;

export type ApiIpWhitelist = typeof apiIpWhitelist.$inferSelect;
export type NewApiIpWhitelist = typeof apiIpWhitelist.$inferInsert;

export type ApiIpWhitelistAudit = typeof apiIpWhitelistAudit.$inferSelect;
export type NewApiIpWhitelistAudit = typeof apiIpWhitelistAudit.$inferInsert;

export type ApiBlacklist = typeof apiBlacklist.$inferSelect;
export type NewApiBlacklist = typeof apiBlacklist.$inferInsert;

export type ApiWhitelist = typeof apiWhitelist.$inferSelect;
export type NewApiWhitelist = typeof apiWhitelist.$inferInsert;

export type ApiWhitelistAudit = typeof apiWhitelistAudit.$inferSelect;
export type NewApiWhitelistAudit = typeof apiWhitelistAudit.$inferInsert;

export type ApiBlacklistAudit = typeof apiBlacklistAudit.$inferSelect;
export type NewApiBlacklistAudit = typeof apiBlacklistAudit.$inferInsert;

export type SecuritySwitch = typeof securitySwitches.$inferSelect;
export type NewSecuritySwitch = typeof securitySwitches.$inferInsert;

export type SecuritySwitchAudit = typeof securitySwitchesAudit.$inferSelect;
export type NewSecuritySwitchAudit = typeof securitySwitchesAudit.$inferInsert;

export type ApiUsageDaily = typeof apiUsageDaily.$inferSelect;
export type NewApiUsageDaily = typeof apiUsageDaily.$inferInsert;

export type ApiUsageWindow = typeof apiUsageWindow.$inferSelect;
export type NewApiUsageWindow = typeof apiUsageWindow.$inferInsert;

export type ApiUsageDelivery = typeof apiUsageDelivery.$inferSelect;
export type NewApiUsageDelivery = typeof apiUsageDelivery.$inferInsert;
