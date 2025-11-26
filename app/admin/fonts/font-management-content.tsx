'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, Edit, Eye, Filter, Plus, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Font {
  id: string;
  name: string;
  englishName?: string | null;
  chineseName?: string | null;
  fontFamily: string;
  normalizedName: string;
  version: string;
  viewCount: number;
  downloadCount: number;
  status: 'draft' | 'published' | 'offline';
  createdAt: Date;
  updatedAt: Date;
  brand?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface FontManagementContentProps {
  initialFonts: {
    total: number;
    page: number;
    pageTotal: number;
    dataList: Font[];
  };
  brands: Brand[];
  categories: Category[];
  initialFilters: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    licenseType?: string;
    style?: string;
    sort?: string;
    order?: string;
  };
}

export function FontManagementContent({
  initialFonts,
  brands,
  categories,
  initialFilters,
}: FontManagementContentProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.categoryId || 'all');
  const [selectedBrand, setSelectedBrand] = useState(initialFilters.brandId || 'all');
  const [selectedLicenseType, setSelectedLicenseType] = useState(
    initialFilters.licenseType || 'all'
  );
  const [selectedStyle, setSelectedStyle] = useState(initialFilters.style || 'all');
  const [selectedFonts, setSelectedFonts] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fontToDelete, setFontToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  // 处理搜索
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'all') params.set('categoryId', selectedCategory);
    if (selectedBrand !== 'all') params.set('brandId', selectedBrand);
    if (selectedLicenseType !== 'all') params.set('licenseType', selectedLicenseType);
    if (selectedStyle !== 'all') params.set('style', selectedStyle);
    params.set('page', '1');

    router.push(`/admin/fonts?${params.toString()}`);
  };

  // 处理筛选重置
  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedLicenseType('all');
    setSelectedStyle('all');
    router.push('/admin/fonts');
  };

  // 处理排序
  const handleSort = (field: string) => {
    const params = new URLSearchParams(window.location.search);
    const currentSort = params.get('sort');
    const currentOrder = params.get('order');

    if (currentSort === field) {
      // 切换排序方向
      params.set('order', currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sort', field);
      params.set('order', 'desc');
    }

    router.push(`/admin/fonts?${params.toString()}`);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page.toString());
    router.push(`/admin/fonts?${params.toString()}`);
  };

  // 处理单个字体选择
  const handleSelectFont = (fontId: string) => {
    const newSelected = new Set(selectedFonts);
    if (newSelected.has(fontId)) {
      newSelected.delete(fontId);
    } else {
      newSelected.add(fontId);
    }
    setSelectedFonts(newSelected);
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedFonts.size === initialFonts.dataList.length) {
      setSelectedFonts(new Set());
    } else {
      setSelectedFonts(new Set(initialFonts.dataList.map((f) => f.id)));
    }
  };

  // 处理删除
  const handleDelete = async (fontId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/fonts/${fontId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除失败');
      }

      toast.success('字体删除成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setFontToDelete(null);
    }
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedFonts.size === 0) {
      toast.error('请先选择要删除的字体');
      return;
    }

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedFonts).map((fontId) =>
        fetch(`/api/fonts/${fontId}`, { method: 'DELETE' })
      );

      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed > 0) {
        toast.warning(`成功删除 ${results.length - failed} 个字体，${failed} 个失败`);
      } else {
        toast.success(`成功删除 ${results.length} 个字体`);
      }

      setSelectedFonts(new Set());
      router.refresh();
    } catch {
      toast.error('批量删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理状态更新
  const handleStatusChange = async (fontId: string, newStatus: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(fontId));
    try {
      const response = await fetch(`/api/fonts/${fontId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新失败');
      }

      toast.success('状态更新成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '状态更新失败');
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(fontId);
        return next;
      });
    }
  };

  const hasFilters =
    searchQuery ||
    selectedCategory !== 'all' ||
    selectedBrand !== 'all' ||
    selectedLicenseType !== 'all' ||
    selectedStyle !== 'all';

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">字体管理</h2>
          <p className="text-muted-foreground">管理系统中的所有字体资源（通过同步功能添加字体）</p>
        </div>
        <Button asChild>
          <Link href="/admin/sync">
            <Plus className="mr-2 h-4 w-4" />
            同步字体
          </Link>
        </Button>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选和搜索
          </CardTitle>
          <CardDescription>使用筛选条件快速查找字体</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-md">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="搜索字体名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="选择品牌" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有品牌</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLicenseType} onValueChange={setSelectedLicenseType}>
              <SelectTrigger>
                <SelectValue placeholder="授权类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有授权</SelectItem>
                <SelectItem value="free_commercial">免费商用</SelectItem>
                <SelectItem value="free_personal">个人免费</SelectItem>
                <SelectItem value="trial">试用版</SelectItem>
                <SelectItem value="paid">付费授权</SelectItem>
                <SelectItem value="contact">联系授权</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger>
                <SelectValue placeholder="选择风格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有风格</SelectItem>
                <SelectItem value="黑体">黑体</SelectItem>
                <SelectItem value="宋体">宋体</SelectItem>
                <SelectItem value="楷体">楷体</SelectItem>
                <SelectItem value="隶书">隶书</SelectItem>
                <SelectItem value="拼音">拼音</SelectItem>
                <SelectItem value="硬笔手写">硬笔手写</SelectItem>
                <SelectItem value="毛笔书法">毛笔书法</SelectItem>
                <SelectItem value="卡通创意">卡通创意</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              搜索
            </Button>
            {hasFilters && (
              <Button variant="outline" onClick={handleReset}>
                <X className="mr-2 h-4 w-4" />
                重置
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 批量操作 */}
      {selectedFonts.size > 0 && (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <div className="text-sm">
              已选择 <span className="font-bold">{selectedFonts.size}</span> 个字体
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              批量删除
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 字体列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>字体列表</CardTitle>
              <CardDescription>
                共 {initialFonts.total} 个字体，第 {initialFonts.page} / {initialFonts.pageTotal} 页
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {initialFonts.dataList.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              {hasFilters ? '没有找到匹配的字体' : '暂无字体数据'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedFonts.size === initialFonts.dataList.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('name')}
                        className="-ml-3"
                      >
                        字体名称
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>字体族</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>品牌</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('viewCount')}>
                        浏览量
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('updatedAt')}>
                        更新时间
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialFonts.dataList.map((font) => (
                    <TableRow key={font.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFonts.has(font.id)}
                          onCheckedChange={() => handleSelectFont(font.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/fonts/${font.normalizedName}`}
                          className="hover:underline"
                        >
                          {font.name}
                        </Link>
                        {font.englishName && (
                          <div className="text-muted-foreground text-xs">{font.englishName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{font.fontFamily}</code>
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
                      <TableCell>
                        <Select
                          value={font.status}
                          onValueChange={(value) => handleStatusChange(font.id, value)}
                          disabled={updatingStatus.has(font.id)}
                        >
                          <SelectTrigger
                            className={`h-8 w-[110px] ${
                              font.status === 'published'
                                ? 'border-green-500 text-green-700 dark:text-green-400'
                                : font.status === 'draft'
                                  ? 'border-gray-400 text-gray-700 dark:text-gray-400'
                                  : 'border-red-500 text-red-700 dark:text-red-400'
                            }`}
                          >
                            <SelectValue>
                              {font.status === 'published' && '✓ 已发布'}
                              {font.status === 'draft' && '○ 草稿'}
                              {font.status === 'offline' && '✕ 已下线'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">○ 草稿</SelectItem>
                            <SelectItem value="published">✓ 已发布</SelectItem>
                            <SelectItem value="offline">✕ 已下线</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="text-muted-foreground h-3 w-3" />
                          <span>{font.viewCount.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {new Date(font.updatedAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/fonts/${font.normalizedName}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFontToDelete(font.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              {initialFonts.pageTotal > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(initialFonts.page - 1)}
                    disabled={initialFonts.page === 1}
                  >
                    上一页
                  </Button>
                  <div className="text-muted-foreground text-sm">
                    第 {initialFonts.page} / {initialFonts.pageTotal} 页
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(initialFonts.page + 1)}
                    disabled={initialFonts.page === initialFonts.pageTotal}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>此操作无法撤销。确定要删除这个字体吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fontToDelete && handleDelete(fontToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
