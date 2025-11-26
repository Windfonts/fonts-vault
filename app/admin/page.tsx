import { AdminLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireAuth } from '@/lib/auth/session';
import { brandService } from '@/lib/services/brand.service';
import { categoryService } from '@/lib/services/category.service';
import { fontService } from '@/lib/services/font.service';
import {
  Activity,
  BarChart3,
  Clock,
  Download,
  Eye,
  FileText,
  Layers,
  Tag,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await requireAuth();

  // 获取统计信息
  const stats = await fontService.getStats();

  // 获取最近更新的字体
  const recentFonts = await fontService.getLatestFontsWithRelations(5);

  // 获取热门字体
  const popularFonts = await fontService.getPopularFontsWithRelations(5);

  // 获取所有分类和品牌用于统计
  const allCategories = await categoryService.findAll();
  const allBrands = await brandService.findAll();

  // 直接从数据库查询每个分类和品牌的字体数量
  const { db } = await import('@/lib/db/client');
  const { fonts } = await import('@/lib/db/schema');
  const { eq, sql } = await import('drizzle-orm');

  // 查询每个分类的字体数量
  const categoryCountsQuery = await db
    .select({
      categoryId: fonts.categoryId,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(fonts)
    .where(sql`${fonts.categoryId} IS NOT NULL`)
    .groupBy(fonts.categoryId);

  const categoryFontCounts = categoryCountsQuery.reduce(
    (acc, row) => {
      if (row.categoryId) {
        acc[row.categoryId] = Number(row.count);
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // 查询每个品牌的字体数量
  const brandCountsQuery = await db
    .select({
      brandId: fonts.brandId,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(fonts)
    .where(sql`${fonts.brandId} IS NOT NULL`)
    .groupBy(fonts.brandId);

  const brandFontCounts = brandCountsQuery.reduce(
    (acc, row) => {
      if (row.brandId) {
        acc[row.brandId] = Number(row.count);
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // 为分类和品牌添加字体数量
  const categoriesWithCount = allCategories.map((cat) => ({
    ...cat,
    fontCount: categoryFontCounts[cat.id] || 0,
  }));

  const brandsWithCount = allBrands.map((brand) => ({
    ...brand,
    fontCount: brandFontCounts[brand.id] || 0,
  }));

  // 计算平均浏览量和下载量
  const avgViews = stats.totalFonts > 0 ? Math.round(stats.totalViews / stats.totalFonts) : 0;
  const avgDownloads =
    stats.totalFonts > 0 ? Math.round(stats.totalDownloads / stats.totalFonts) : 0;

  return (
    <AdminLayout>
      {/* 欢迎区域 */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold">管理后台</h2>
        <p className="text-muted-foreground">欢迎回来，{session.user.name}</p>
      </div>

      {/* 统计卡片 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总字体数</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFonts}</div>
            <p className="text-muted-foreground text-xs">系统中的所有字体</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">厂商数</CardTitle>
            <Tag className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBrands}</div>
            <p className="text-muted-foreground text-xs">字体厂商</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分类数</CardTitle>
            <Layers className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
            <p className="text-muted-foreground text-xs">字体分类</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总浏览量</CardTitle>
            <Eye className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <p className="text-muted-foreground text-xs">累计浏览次数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总下载量</CardTitle>
            <Download className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
            <p className="text-muted-foreground text-xs">累计下载次数</p>
          </CardContent>
        </Card>
      </div>

      {/* 数据分析卡片 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均浏览量</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgViews.toLocaleString()}</div>
            <p className="text-muted-foreground text-xs">每个字体平均浏览次数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均下载量</CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDownloads.toLocaleString()}</div>
            <p className="text-muted-foreground text-xs">每个字体平均下载次数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">转化率</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalViews > 0
                ? ((stats.totalDownloads / stats.totalViews) * 100).toFixed(1)
                : '0'}
              %
            </div>
            <p className="text-muted-foreground text-xs">浏览到下载的转化率</p>
          </CardContent>
        </Card>
      </div>

      {/* 分类和品牌统计 */}
      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        {/* 分类统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              分类统计
            </CardTitle>
            <CardDescription>各分类下的字体数量分布</CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesWithCount.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">暂无分类数据</div>
            ) : (
              <div className="space-y-3">
                {categoriesWithCount.slice(0, 8).map((category) => {
                  const percentage =
                    stats.totalFonts > 0
                      ? (((category.fontCount || 0) / stats.totalFonts) * 100).toFixed(1)
                      : '0';
                  return (
                    <div key={category.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-muted-foreground">
                          {category.fontCount || 0} 个字体 ({percentage}%)
                        </span>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 品牌统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              厂商统计
            </CardTitle>
            <CardDescription>各厂商下的字体数量分布</CardDescription>
          </CardHeader>
          <CardContent>
            {brandsWithCount.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">暂无厂商数据</div>
            ) : (
              <div className="space-y-3">
                {brandsWithCount
                  .sort((a, b) => b.fontCount - a.fontCount)
                  .slice(0, 8)
                  .map((brand) => {
                    const percentage =
                      stats.totalFonts > 0
                        ? (((brand.fontCount || 0) / stats.totalFonts) * 100).toFixed(1)
                        : '0';
                    return (
                      <div key={brand.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{brand.name}</span>
                          <span className="text-muted-foreground">
                            {brand.fontCount || 0} 个字体 ({percentage}%)
                          </span>
                        </div>
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 最近更新的字体 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  最近更新
                </CardTitle>
                <CardDescription>最新添加或更新的字体</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/fonts">查看全部</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentFonts.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">暂无字体数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>字体名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>厂商</TableHead>
                    <TableHead className="text-right">更新时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentFonts.map((font) => (
                    <TableRow key={font.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/fonts/${font.id}`} className="hover:underline">
                          {font.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {font.category ? (
                          <Badge variant="secondary">{font.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {font.brand ? (
                          <Badge variant="outline">{font.brand.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {new Date(font.updatedAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 热门字体 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  热门字体
                </CardTitle>
                <CardDescription>按浏览量排序的热门字体</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/fonts?sort=viewCount&order=desc">查看全部</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {popularFonts.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">暂无字体数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>字体名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead className="text-right">浏览量</TableHead>
                    <TableHead className="text-right">下载量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularFonts.map((font) => (
                    <TableRow key={font.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/fonts/${font.id}`} className="hover:underline">
                          {font.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {font.category ? (
                          <Badge variant="secondary">{font.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="text-muted-foreground h-3 w-3" />
                          <span>{font.viewCount.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Download className="text-muted-foreground h-3 w-3" />
                          <span>{font.downloadCount.toLocaleString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
