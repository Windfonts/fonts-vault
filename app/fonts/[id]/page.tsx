import { PublicLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { fontService } from '@/lib/services/font.service';
import { syncService } from '@/lib/services/sync.service';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FontDetailContent } from './font-detail-content';

// 动态渲染，避免构建时查询数据库
export const dynamic = 'force-dynamic';

export default async function FontDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const normalizedId = id.toLowerCase();

  // 使用 normalizedName 查询
  const font = await fontService.findByNormalizedNameWithRelations(normalizedId);

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
  const filteredRelatedFonts = relatedFonts.dataList
    .filter((f) => f.id !== font.id)
    .map((f) => ({
      ...f,
      brand: f.brand ?? null,
      category: f.category ?? null,
    }));

  const analysis = await syncService.fetchFontAnalysis(font.normalizedName);

  return (
    <PublicLayout>
      <Suspense fallback={<FontDetailSkeleton />}>
        <FontDetailContent
          font={font}
          relatedFonts={
            filteredRelatedFonts as Parameters<typeof FontDetailContent>[0]['relatedFonts']
          }
          analysis={analysis}
        />
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
