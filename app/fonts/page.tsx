import { PublicLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { brandService } from '@/lib/services/brand.service';
import { categoryService } from '@/lib/services/category.service';
import { Suspense } from 'react';
import { FontListContent } from './font-list-content';
import { VerticalTagNav } from '@/components/home/vertical-tag-nav';
import { resolveNextHomeTags } from '@/lib/next-home-tags';

// 动态渲染，避免构建时查询数据库
export const dynamic = 'force-dynamic';

export default async function FontsPage() {
  // 获取分类和品牌数据用于筛选器
  const [categories, brands] = await Promise.all([
    categoryService.findAll(),
    brandService.findAll(),
  ]);

  // 从数据库读取风格标签
  const { styleService } = await import('@/lib/services/style.service');
  const availableTags = await styleService.getStyleNames();

  const homeTags = resolveNextHomeTags(categories);

  return (
    <PublicLayout>
      <div className="container py-8">
        <div className="-mx-4 mb-2 sm:-mx-6 lg:-mx-8">
          <VerticalTagNav tags={homeTags} tone="list" />
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">字体库</h1>
        </div>

        <Suspense fallback={<FontListSkeleton />}>
          <FontListContent categories={categories} brands={brands} availableTags={availableTags} />
        </Suspense>
      </div>
    </PublicLayout>
  );
}

function FontListSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Filter Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
