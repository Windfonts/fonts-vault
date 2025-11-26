/**
 * 测试数据库连接和初始化
 * 运行: npx tsx src/lib/db/test-connection.ts
 */
import { initializeTables, checkDatabaseConnection, getDatabaseInfo } from './init';

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');

  // 1. 检查连接
  const isConnected = await checkDatabaseConnection();
  console.log(`Connection status: ${isConnected ? '✅ Connected' : '❌ Failed'}\n`);

  if (!isConnected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  // 2. 初始化表
  console.log('📦 Initializing tables...');
  await initializeTables();
  console.log('');

  // 3. 获取数据库信息
  console.log('📊 Database information:');
  const info = await getDatabaseInfo();
  console.log(JSON.stringify(info, null, 2));
  console.log('');

  console.log('✅ All tests passed!');
}

testDatabase().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
