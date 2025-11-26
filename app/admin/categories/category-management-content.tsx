'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryForm } from './category-form';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryManagementContentProps {
  initialCategories: Category[];
}

export function CategoryManagementContent({ initialCategories }: CategoryManagementContentProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState(initialCategories);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(lowerQuery) ||
        category.slug.toLowerCase().includes(lowerQuery) ||
        category.description?.toLowerCase().includes(lowerQuery)
    );
    setFilteredCategories(filtered);
  };

  // 处理删除
  const handleDelete = async (category: Category) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除失败');
      }

      toast.success('分类删除成功');

      // 更新本地状态
      const updatedCategories = categories.filter((c) => c.id !== category.id);
      setCategories(updatedCategories);
      handleSearch(searchQuery); // 重新应用搜索过滤

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  // 处理创建成功
  const handleCreateSuccess = (newCategory: Category) => {
    const updatedCategories = [...categories, newCategory].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    setCategories(updatedCategories);
    handleSearch(searchQuery);
    setCreateDialogOpen(false);
    toast.success('分类创建成功');
    router.refresh();
  };

  // 处理编辑成功
  const handleEditSuccess = (updatedCategory: Category) => {
    const updatedCategories = categories
      .map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });
    setCategories(updatedCategories);
    handleSearch(searchQuery);
    setEditDialogOpen(false);
    setCategoryToEdit(null);
    toast.success('分类更新成功');
    router.refresh();
  };

  // 处理排序
  const handleMoveUp = async (category: Category, index: number) => {
    if (index === 0) return;

    const prevCategory = filteredCategories[index - 1];
    const newOrder = prevCategory.order;

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: newOrder }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '排序失败');
      }

      // 同时更新前一个分类的order
      await fetch(`/api/categories/${prevCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: category.order }),
      });

      toast.success('排序更新成功');
      router.refresh();

      // 重新获取数据
      const updatedCategories = await fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => data.data);
      setCategories(updatedCategories);
      handleSearch(searchQuery);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '排序失败');
    }
  };

  const handleMoveDown = async (category: Category, index: number) => {
    if (index === filteredCategories.length - 1) return;

    const nextCategory = filteredCategories[index + 1];
    const newOrder = nextCategory.order;

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: newOrder }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '排序失败');
      }

      // 同时更新后一个分类的order
      await fetch(`/api/categories/${nextCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: category.order }),
      });

      toast.success('排序更新成功');
      router.refresh();

      // 重新获取数据
      const updatedCategories = await fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => data.data);
      setCategories(updatedCategories);
      handleSearch(searchQuery);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '排序失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">分类管理</h2>
          <p className="text-muted-foreground">管理系统中的所有字体分类</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加分类
        </Button>
      </div>

      {/* 搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索分类
          </CardTitle>
          <CardDescription>按名称、Slug 或描述搜索分类</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="搜索分类..."
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

      {/* 分类列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>分类列表</CardTitle>
              <CardDescription>
                共 {filteredCategories.length} 个分类
                {searchQuery && ` (从 ${categories.length} 个中筛选)`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              {searchQuery ? '没有找到匹配的分类' : '暂无分类数据'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">排序</TableHead>
                  <TableHead>分类名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="text-right">更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category, index) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(category, index)}
                          disabled={index === 0}
                          className="h-7 w-7 p-0"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(category, index)}
                          disabled={index === filteredCategories.length - 1}
                          className="h-7 w-7 p-0"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{category.slug}</code>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground max-w-xs truncate text-sm">
                        {category.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm">
                      {new Date(category.updatedAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCategoryToEdit(category);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCategoryToDelete(category);
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
          )}
        </CardContent>
      </Card>

      {/* 创建分类对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
            <DialogDescription>创建一个新的字体分类</DialogDescription>
          </DialogHeader>
          <CategoryForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 编辑分类对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
            <DialogDescription>修改分类信息</DialogDescription>
          </DialogHeader>
          {categoryToEdit && (
            <CategoryForm
              category={categoryToEdit}
              onSuccess={handleEditSuccess}
              onCancel={() => {
                setEditDialogOpen(false);
                setCategoryToEdit(null);
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
              确定要删除分类 &quot;{categoryToDelete?.name}&quot; 吗？
              <br />
              <br />
              此操作无法撤销。如果该分类下有关联的字体，删除将会失败。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => categoryToDelete && handleDelete(categoryToDelete)}
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
