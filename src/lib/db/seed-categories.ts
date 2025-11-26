/**
 * 种子数据：初始化分类
 * 运行: npx tsx src/lib/db/seed-categories.ts
 */
import { db, categories } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

// 生成 slug（将中文转为拼音或简单的标识符）
function generateSlug(name: string): string {
  const slugMap: Record<string, string> = {
    无衬线字体: 'sans-serif',
    衬线: 'serif',
    粗衬线字体: 'slab-serif',
    脚本: 'script',
    Mono: 'mono',
    手写体: 'handwriting',
  };

  return slugMap[name] || name.toLowerCase().replace(/\s+/g, '-');
}

async function seedCategories() {
  try {
    console.log('📦 Loading category data...');

    // 读取 category.json
    const categoryDataPath = join(process.cwd(), 'data', 'category.json');
    const categoryData = JSON.parse(readFileSync(categoryDataPath, 'utf-8'));

    console.log(`Found ${categoryData.category.length} categories\n`);

    // 插入分类
    for (let i = 0; i < categoryData.category.length; i++) {
      const categoryName = categoryData.category[i];
      const slug = generateSlug(categoryName);

      try {
        await db.insert(categories).values({
          id: crypto.randomUUID(),
          name: categoryName,
          slug: slug,
          description: `${categoryName}类型的字体`,
          order: i,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Created category: ${categoryName} (${slug})`);
      } catch (error) {
        if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
          console.log(`⏭️  Category already exists: ${categoryName}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Categories seeded successfully!');

    // 显示所有分类
    const allCategories = await db.select().from(categories);
    console.log(`\n📊 Total categories in database: ${allCategories.length}`);
  } catch (error) {
    console.error('❌ Failed to seed categories:', error);
    process.exit(1);
  }
}

seedCategories();
