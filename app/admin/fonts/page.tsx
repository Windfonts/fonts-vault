import { AdminLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAuth } from '@/lib/auth/session';
import { brandService } from '@/lib/services/brand.service';
import { categoryService } from '@/lib/services/category.service';
import { fontService } from '@/lib/services/font.service';
import { Suspense } from 'react';
import { FontManagementContent } from './font-management-content';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
    brandId?: string;
    sort?: 'name' | 'viewCount' | 'downloadCount' | 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
  }>;
}

function FontManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

export default async function FontManagementPage({ searchParams }: PageProps) {
  await requireAuth();

  // 解析查询参数
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const categoryId = params.categoryId || undefined;
  const brandId = params.brandId || undefined;
  const sort = (params.sort as 'name' | 'viewCount' | 'downloadCount' | 'createdAt') || 'createdAt';
  const order = (params.order as 'asc' | 'desc') || 'desc';

  // 获取字体列表
  const fontsResult = await fontService.findAllWithRelations({
    page,
    size: 20,
    search,
    categoryId,
    brandId,
    sort,
    order,
  });

  // 获取品牌和分类列表用于筛选
  const brands = await brandService.findAll();
  const categories = await categoryService.findAll();

  return (
    <AdminLayout>
      <Suspense fallback={<FontManagementSkeleton />}>
        <FontManagementContent
          initialFonts={fontsResult}
          brands={brands}
          categories={categories}
          initialFilters={{
            search,
            categoryId,
            brandId,
            sort,
            order,
          }}
        />
      </Suspense>
    </AdminLayout>
  );
}
