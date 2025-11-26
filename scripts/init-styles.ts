/**
 * 初始化风格数据
 * 从 category.json 导入风格到数据库
 *
 * 运行方式：
 * npx tsx scripts/init-styles.ts
 */

import { styleService } from '../src/lib/services/style.service';

async function main() {
  console.log('开始初始化风格数据...');

  try {
    await styleService.initializeFromJson();
    console.log('✅ 风格数据初始化成功');
  } catch (error) {
    console.error('❌ 风格数据初始化失败:', error);
    process.exit(1);
  }
}

main();
