import { client } from './client';

/**
 * 初始化数据库表结构
 * 如果表不存在则创建
 */
export async function initializeTables(): Promise<void> {
  try {
    // 创建 brands 表
    await client.execute(`
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        logo_url TEXT,
        banner_url TEXT,
        description TEXT,
        website TEXT,
        social_links TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 创建 categories 表
    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 创建 fonts 表
    await client.execute(`
      CREATE TABLE IF NOT EXISTS fonts (
        id TEXT PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        english_name TEXT,
        chinese_name TEXT,
        font_family TEXT NOT NULL,
        original_name TEXT,
        weights TEXT NOT NULL,
        version TEXT NOT NULL,
        copyright TEXT,
        description TEXT,
        designer TEXT,
        foundry TEXT,
        release_year INTEGER,
        category TEXT,
        font_category TEXT,
        style TEXT,
        category_id TEXT,
        brand_id TEXT,
        tags TEXT DEFAULT '[]',
        font_tags TEXT DEFAULT '[]',
        languages TEXT DEFAULT '[]',
        use_cases TEXT DEFAULT '[]',
        license TEXT,
        license_type TEXT,
        price REAL,
        purchase_url TEXT,
        license_description TEXT,
        oss_path TEXT NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        download_count INTEGER NOT NULL DEFAULT 0,
        api_call_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
      );
    `);

    // 创建索引
    await client.execute(`
      CREATE INDEX IF NOT EXISTS fonts_name_idx ON fonts(name);
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS fonts_family_idx ON fonts(font_family);
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS fonts_category_idx ON fonts(category_id);
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS fonts_brand_idx ON fonts(brand_id);
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  }
}

/**
 * 检查数据库连接
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await client.execute('SELECT 1 as test');
    return result !== undefined;
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
    return false;
  }
}

/**
 * 获取数据库信息
 */
export async function getDatabaseInfo() {
  try {
    const result = await client.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );

    return {
      connected: true,
      path: process.env.DATABASE_URL || 'file:./data/dev.db',
      tables: result.rows.map((row) => (row as unknown as { name: string }).name),
    };
  } catch (error) {
    return {
      connected: false,
      path: process.env.DATABASE_URL || 'file:./data/dev.db',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
