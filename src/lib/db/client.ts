import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { logger } from '../logger';

// 获取数据库路径
const getDatabasePath = (): string => {
  const dbUrl = process.env.DATABASE_URL || 'file:./data/dev.db';
  return dbUrl;
};

// 确保数据库目录存在
const ensureDbDirectory = (dbUrl: string): void => {
  const dbPath = dbUrl.replace('file:', '');
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

// 初始化数据库连接
const initDatabase = () => {
  const dbUrl = getDatabasePath();

  // 确保目录存在
  ensureDbDirectory(dbUrl);

  logger.info('[Database] Initializing database connection', { dbUrl });

  // 创建 libSQL 客户端，启用 WAL 模式以提高并发性能
  const client = createClient({
    url: dbUrl,
  });

  // 创建 Drizzle 实例
  const db = drizzle(client, { schema });

  // 启用 WAL 模式和其他性能优化
  try {
    client.execute('PRAGMA journal_mode = WAL;');
    client.execute('PRAGMA synchronous = NORMAL;');
    client.execute('PRAGMA cache_size = -64000;'); // 64MB cache
    client.execute('PRAGMA temp_store = MEMORY;');
    client.execute('PRAGMA mmap_size = 30000000000;'); // 30GB mmap
    logger.info('[Database] Performance optimizations applied');
  } catch (error) {
    logger.warn('[Database] Could not apply all performance optimizations', { error });
  }

  return { db, client };
};

// 导出数据库实例
const { db, client } = initDatabase();

export { db, client };
export * from './schema';
