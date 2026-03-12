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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, ExternalLink, Plus, Search, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { BrandForm } from './brand-form';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  website?: string | null;
  socialLinks?: {
    twitter?: string;
    github?: string;
    weibo?: string;
  } | null;
  status: 'draft' | 'published' | 'offline';
  createdAt: Date;
  updatedAt: Date;
}

interface BrandManagementContentProps {
  initialBrands: Brand[];
}

export function BrandManagementContent({ initialBrands }: BrandManagementContentProps) {
  const router = useRouter();
  const [brands, setBrands] = useState(initialBrands);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBrands, setFilteredBrands] = useState(initialBrands);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredBrands(brands);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = brands.filter(
      (brand) =>
        brand.name.toLowerCase().includes(lowerQuery) ||
        brand.slug.toLowerCase().includes(lowerQuery) ||
        brand.description?.toLowerCase().includes(lowerQuery)
    );
    setFilteredBrands(filtered);
  };

  // 处理删除
  const handleDelete = async (brand: Brand) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/brands/${brand.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除失败');
      }

      toast.success('品牌删除成功');

      // 更新本地状态
      const updatedBrands = brands.filter((b) => b.id !== brand.id);
      setBrands(updatedBrands);
      handleSearch(searchQuery); // 重新应用搜索过滤

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setBrandToDelete(null);
    }
  };

  // 处理创建成功
  const handleCreateSuccess = (newBrand: Brand) => {
    const updatedBrands = [...brands, newBrand].sort((a, b) => a.name.localeCompare(b.name));
    setBrands(updatedBrands);
    handleSearch(searchQuery);
    setCreateDialogOpen(false);
    toast.success('品牌创建成功');
    router.refresh();
  };

  // 处理编辑成功
  const handleEditSuccess = (updatedBrand: Brand) => {
    const updatedBrands = brands.map((b) => (b.id === updatedBrand.id ? updatedBrand : b));
    setBrands(updatedBrands);
    handleSearch(searchQuery);
    setEditDialogOpen(false);
    setBrandToEdit(null);
    toast.success('品牌更新成功');
    router.refresh();
  };

  // 获取状态徽章
  const getStatusBadge = (status: Brand['status']) => {
    const variants = {
      draft: { label: '草稿', variant: 'secondary' as const },
      published: { label: '已发布', variant: 'default' as const },
      offline: { label: '已下线', variant: 'destructive' as const },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">厂商管理</h2>
          <p className="text-muted-foreground">管理系统中的所有厂商信息</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加厂商
        </Button>
      </div>

      {/* 搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索厂商
          </CardTitle>
          <CardDescription>按名称、Slug 或描述搜索厂商</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="搜索厂商..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button variant="outline" onClick={() => handleSearch('')}>
                <X className="mr-2 h-4 w-4" />
                清除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 品牌列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>厂商列表</CardTitle>
              <CardDescription>
                共 {filteredBrands.length} 个厂商
                {searchQuery && ` (从 ${brands.length} 个中筛选)`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBrands.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              {searchQuery ? '没有找到匹配的厂商' : '暂无厂商数据'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">厂商名称</TableHead>
                    <TableHead className="min-w-[120px]">Slug</TableHead>
                    <TableHead className="min-w-[80px]">状态</TableHead>
                    <TableHead className="min-w-[80px]">网站</TableHead>
                    <TableHead className="min-w-[200px]">描述</TableHead>
                    <TableHead className="min-w-[100px] text-right">更新时间</TableHead>
                    <TableHead className="min-w-[120px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {brand.logoUrl && (
                            <Image
                              src={brand.logoUrl}
                              alt={brand.name}
                              width={32}
                              height={32}
                              className="h-8 w-8 flex-shrink-0 rounded object-cover"
                              unoptimized
                            />
                          )}
                          <span className="whitespace-nowrap">{brand.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs whitespace-nowrap">{brand.slug}</code>
                      </TableCell>
                      <TableCell>{getStatusBadge(brand.status)}</TableCell>
                      <TableCell>
                        {brand.website ? (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary flex items-center gap-1 text-sm whitespace-nowrap hover:underline"
                          >
                            访问
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground max-w-[200px] truncate text-sm">
                          {brand.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm whitespace-nowrap">
                        {new Date(brand.updatedAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBrandToEdit(brand);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBrandToDelete(brand);
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建品牌对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加厂商</DialogTitle>
            <DialogDescription>创建一个新的厂商</DialogDescription>
          </DialogHeader>
          <BrandForm onSuccess={handleCreateSuccess} onCancel={() => setCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* 编辑品牌对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑厂商</DialogTitle>
            <DialogDescription>修改厂商信息</DialogDescription>
          </DialogHeader>
          {brandToEdit && (
            <BrandForm
              brand={brandToEdit}
              onSuccess={handleEditSuccess}
              onCancel={() => {
                setEditDialogOpen(false);
                setBrandToEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除厂商 &quot;{brandToDelete?.name}&quot; 吗？
              <br />
              <br />
              此操作无法撤销。如果该厂商下有关联的字体，删除将会失败。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => brandToDelete && handleDelete(brandToDelete)}
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
