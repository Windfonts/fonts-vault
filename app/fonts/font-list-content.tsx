'use client';

import { FontCard } from '@/components/font/font-card';
import { FontSampleBar } from '@/components/font/font-sample-bar';
import { VerticalTagNav } from '@/components/home/vertical-tag-nav';
import { FontSampleProvider } from '@/hooks/use-font-sample';
import Link from 'next/link';
import { picksCount } from '@/lib/font-picks';
import { FilterState, FontFilter } from '@/components/font/font-filter';
import { FontSearch } from '@/components/font/font-search';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Brand, Category, Font } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface FontListContentProps {
  categories: Category[];
  brands: Brand[];
  availableTags: string[];
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'createdAt' | 'viewCount';
type OrderOption = 'asc' | 'desc';

export function FontListContent({ categories, brands, availableTags }: FontListContentProps) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  // State
  const viewMode: ViewMode = 'list';
  const [pickN, setPickN] = useState(0);
  const [fonts, setFonts] = useState<
    Array<
      Omit<Font, 'brand' | 'category'> & {
        brand?: Brand | null;
        category?: Category | null;
      }
    >
  >([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageTotal, setPageTotal] = useState(0);

  // 使用 searchParams 的字符串表示作为依赖，确保只在 URL 真正变化时触发
  const searchParamsString = searchParamsHook.toString();

  // P0: unify q → search (API already aliases; UI must not leave silent full list)
  useEffect(() => {
    const q = searchParamsHook.get('q');
    const s = searchParamsHook.get('search');
    if (q && !s) {
      const p = new URLSearchParams(searchParamsHook.toString());
      p.set('search', q);
      p.delete('q');
      router.replace(`/fonts?${p.toString()}`);
    }
  }, [searchParamsString, router, searchParamsHook]);

  useEffect(() => {
    const sync = () => setPickN(picksCount());
    sync();
    window.addEventListener('windfonts-picks-changed', sync);
    return () => window.removeEventListener('windfonts-picks-changed', sync);
  }, []);

  // 读取当前 URL 参数用于渲染
  const categoryId = searchParamsHook.get('category') || undefined;
  const brandId = searchParamsHook.get('brand') || undefined;
  const search = searchParamsHook.get('search') || searchParamsHook.get('q') || undefined;
  const sort = (searchParamsHook.get('sort') as SortOption) || 'createdAt';
  const order = (searchParamsHook.get('order') as OrderOption) || 'desc';
  const licenseType = searchParamsHook.get('licenseType') || undefined;
  const tagsParam = searchParamsHook.get('tags') || undefined;
  const tagsFromUrl = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;

  // Fetch fonts
  useEffect(() => {
    const fetchFonts = async () => {
      // 从 searchParams 读取参数
      const categoryId = searchParamsHook.get('category') || undefined;
      const brandId = searchParamsHook.get('brand') || undefined;
      // q is alias of search — never silent-full-list while ?q= present
      const search =
        searchParamsHook.get('search') || searchParamsHook.get('q') || undefined;
      const sort = (searchParamsHook.get('sort') as SortOption) || 'createdAt';
      const order = (searchParamsHook.get('order') as OrderOption) || 'desc';
      const licenseType = searchParamsHook.get('licenseType') || undefined;
      const tagsParam = searchParamsHook.get('tags') || undefined;
      const page = parseInt(searchParamsHook.get('page') || '1', 10);

      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', page.toString());
        queryParams.set('size', '12');

        if (categoryId) queryParams.set('categoryId', categoryId);
        if (brandId) queryParams.set('brandId', brandId);
        if (search) queryParams.set('search', search);
        if (licenseType) queryParams.set('licenseType', licenseType);
        if (tagsParam) queryParams.set('tags', tagsParam);
        queryParams.set('sort', sort);
        queryParams.set('order', order);
        // 前台只显示已发布的字体
        queryParams.set('status', 'published');

        const response = await fetch(`/api/fonts?${queryParams.toString()}`);
        const result = await response.json();

        if (result.code === 200) {
          setFonts(result.data.dataList);
          setTotal(result.data.total);
          setCurrentPage(result.data.page);
          setPageTotal(result.data.pageTotal);
        }
      } catch (error) {
        console.error('Failed to fetch fonts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFonts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  // Update URL with new parameters
  const updateURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParamsHook.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });

      // 注意：不要在这里重置 page，否则会导致翻页失效
      // 如果需要在筛选时重置页码，应该在各个 handler 中显式设置 page: '1'

      router.push(`/fonts?${newParams.toString()}`, { scroll: false });
    },
    [searchParamsHook, router]
  );

  // Handlers
  const handleFilterChange = useCallback(
    (filters: FilterState) => {
      const currentCategory = searchParamsHook.get('category') || undefined;
      const currentBrand = searchParamsHook.get('brand') || undefined;
      const currentLicenseType = searchParamsHook.get('licenseType') || undefined;
      const currentTagsParam = searchParamsHook.get('tags') || undefined;
      const currentTags = currentTagsParam
        ? currentTagsParam.split(',').filter(Boolean)
        : undefined;

      const isCategoryChanged = filters.categoryId !== currentCategory;
      const isBrandChanged = filters.brandId !== currentBrand;
      const isLicenseChanged = filters.licenseType !== currentLicenseType;
      const newTags = filters.tags && filters.tags.length > 0 ? filters.tags : undefined;
      const normalize = (arr?: string[]) =>
        arr && arr.length > 0 ? [...arr].sort().join(',') : undefined;
      const isTagsChanged = normalize(newTags) !== normalize(currentTags);

      if (!isCategoryChanged && !isBrandChanged && !isLicenseChanged && !isTagsChanged) return;

      updateURL({
        category: filters.categoryId,
        brand: filters.brandId,
        licenseType: filters.licenseType,
        tags: newTags ? newTags.join(',') : undefined,
        page: '1', // 筛选时重置到第一页
      });
    },
    [updateURL, searchParamsHook]
  );

  const handleSearch = useCallback(
    (query: string) => {
      const currentSearch = searchParamsHook.get('search') || undefined;
      const nextSearch = query || undefined;

      if (nextSearch === currentSearch) return;

      updateURL({
        search: nextSearch,
        page: '1', // 搜索时重置到第一页
      });
    },
    [updateURL, searchParamsHook]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const [newSort, newOrder] = value.split('-') as [SortOption, OrderOption];
      if (newSort === sort && newOrder === order) return;
      updateURL({
        sort: newSort,
        order: newOrder,
        page: '1', // 排序时重置到第一页
      });
    },
    [updateURL, sort, order]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage === currentPage) return;
      updateURL({ page: newPage.toString() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateURL, currentPage]
  );

  // Initial filters from URL
  const initialFilters: FilterState = {
    categoryId,
    brandId,
    licenseType,
    tags: tagsFromUrl,
  };

  return (
    <FontSampleProvider>
    <div className="dark space-y-6 text-foreground">
<div className="space-y-6">
        {/* Main Content */}
        <main className="space-y-6">
          <FontSampleBar />

          {/* Search and Controls */}
          <div className="flex flex-col gap-4">
            <FontSearch onSearch={handleSearch} initialValue={search} className="w-full" placeholder="搜索字体名称、品牌…" />

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              {/* Sort Selector */}
              <Select value={`${sort}-${order}`} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">名称 A-Z</SelectItem>
                  <SelectItem value="name-desc">名称 Z-A</SelectItem>
                  <SelectItem value="createdAt-desc">最新添加</SelectItem>
                  <SelectItem value="createdAt-asc">最早添加</SelectItem>
                  <SelectItem value="viewCount-desc">最受欢迎</SelectItem>
                  <SelectItem value="viewCount-asc">最少浏览</SelectItem>
                </SelectContent>
              </Select>


            </div>
          </div>

          {/* Results Count */}
          <div className="text-muted-foreground text-sm">
            {loading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <span>
                共找到 <span className="text-foreground font-semibold">{total}</span> 个字体
              </span>
            )}
          </div>

          {/* Font Grid/List */}
          {loading ? (
            <div
              className={cn(
                'grid gap-6',
                viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
              )}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[300px] w-full" />
              ))}
            </div>
          ) : fonts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="mb-2 text-xl font-semibold">没有匹配的字体</h3>
              <p className="text-muted-foreground">试试别的关键词，或清掉筛选。空结果不是「全库」。</p>
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-6',
                viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
              )}
            >
              {fonts.map((font) => (
                <FontCard key={font.id} font={font} variant={viewMode} showPreview={true} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && pageTotal > 1 && (
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1">上一页</span>
              </Button>

              <div className="flex max-w-full items-center gap-1 overflow-x-auto px-2">
                {Array.from({ length: Math.min(pageTotal, 5) }, (_, i) => {
                  let pageNum: number;

                  if (pageTotal <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pageTotal - 2) {
                    pageNum = pageTotal - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="min-w-[40px] flex-shrink-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pageTotal}
                className="w-full sm:w-auto"
              >
                <span className="mr-1">下一页</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </main>
      </div>
    <Link
      href="/fonts/picks"
      className="pick-fab fixed bottom-8 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-black text-sm text-white shadow-lg hover:bg-zinc-800"
      title="我的选字"
    >
      选字{pickN ? `·${pickN}` : ''}
    </Link>
    </div>
    </FontSampleProvider>
  );
}
