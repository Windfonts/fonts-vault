import { PublicLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { fontService } from '@/lib/services/font.service';
import { syncService } from '@/lib/services/sync.service';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FontDetailContent } from './font-detail-content';

// ISR: 每小时重新生成页面
export const revalidate = 3600;

// 动态路由参数
export const dynamicParams = true;

// 生成静态参数 - 预渲染热门字体
export async function generateStaticParams() {
  try {
    // 获取前20个最受欢迎的字体进行预渲染
    const fonts = await fontService.findAll({
      page: 1,
      size: 20,
      sort: 'viewCount',
      order: 'desc',
    });

    return fonts.dataList.map((font) => ({
      id: font.normalizedName,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function FontDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 使用 normalizedName 查询
  const font = await fontService.findByNormalizedNameWithRelations(id);

  if (!font) {
    notFound();
  }

  // Increment view count
  await fontService.incrementViewCount(font.id);

  // Get related fonts (same category or brand)
  const relatedFonts = await fontService.findAllWithRelations({
    categoryId: font.categoryId || undefined,
    page: 1,
    size: 6,
  });

  // Filter out current font from related fonts
  const filteredRelatedFonts = relatedFonts.dataList.filter((f) => f.id !== font.id);

  const analysis = await syncService.fetchFontAnalysis(font.normalizedName);

  return (
    <PublicLayout>
      <Suspense fallback={<FontDetailSkeleton />}>
        <FontDetailContent font={font} relatedFonts={filteredRelatedFonts} analysis={analysis} />
      </Suspense>
    </PublicLayout>
  );
}

function FontDetailSkeleton() {
  return (
    <div className="container py-8">
      <Skeleton className="mb-4 h-8 w-64" />
      <Skeleton className="mb-8 h-96 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
