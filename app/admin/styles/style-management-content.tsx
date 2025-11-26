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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ArrowDown, ArrowUp, Edit, Palette, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Style {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StyleManagementContentProps {
  initialStyles: Style[];
}

export function StyleManagementContent({ initialStyles }: StyleManagementContentProps) {
  const router = useRouter();
  const [styles, setStyles] = useState(initialStyles);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStyles, setFilteredStyles] = useState(initialStyles);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<Style | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [styleToEdit, setStyleToEdit] = useState<Style | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredStyles(styles);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = styles.filter(
      (style) =>
        style.name.toLowerCase().includes(lowerQuery) ||
        style.slug.toLowerCase().includes(lowerQuery) ||
        style.description?.toLowerCase().includes(lowerQuery)
    );
    setFilteredStyles(filtered);
  };

  // 生成 slug
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // 处理创建
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入风格名称');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/styles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: generateSlug(formData.name.trim()),
          description: formData.description.trim() || undefined,
          order: styles.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建失败');
      }

      const result = await response.json();
      const newStyle = result.data;

      const updatedStyles = [...styles, newStyle].sort((a, b) => a.order - b.order);
      setStyles(updatedStyles);
      handleSearch(searchQuery);
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      toast.success('风格添加成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 处理编辑
  const handleEdit = async () => {
    if (!formData.name.trim() || !styleToEdit) {
      toast.error('请输入风格名称');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/styles/${styleToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: generateSlug(formData.name.trim()),
          description: formData.description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新失败');
      }

      const result = await response.json();
      const updatedStyle = result.data;

      const updatedStyles = styles.map((s) => (s.id === updatedStyle.id ? updatedStyle : s));
      setStyles(updatedStyles);
      handleSearch(searchQuery);
      setEditDialogOpen(false);
      setStyleToEdit(null);
      setFormData({ name: '', description: '' });
      toast.success('风格更新成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 处理删除
  const handleDelete = async (style: Style) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/styles/${style.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除失败');
      }

      const updatedStyles = styles.filter((s) => s.id !== style.id);
      setStyles(updatedStyles);
      handleSearch(searchQuery);
      toast.success('风格删除成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setStyleToDelete(null);
    }
  };

  // 处理排序
  const handleMoveUp = async (style: Style, index: number) => {
    if (index === 0) return;

    const prevStyle = filteredStyles[index - 1];

    setIsSaving(true);
    try {
      await Promise.all([
        fetch(`/api/styles/${style.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: prevStyle.order }),
        }),
        fetch(`/api/styles/${prevStyle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: style.order }),
        }),
      ]);

      toast.success('排序更新成功');
      router.refresh();

      // 重新获取数据
      const response = await fetch('/api/styles');
      const result = await response.json();
      setStyles(result.data);
      handleSearch(searchQuery);
    } catch (error) {
      toast.error('排序失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveDown = async (style: Style, index: number) => {
    if (index === filteredStyles.length - 1) return;

    const nextStyle = filteredStyles[index + 1];

    setIsSaving(true);
    try {
      await Promise.all([
        fetch(`/api/styles/${style.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: nextStyle.order }),
        }),
        fetch(`/api/styles/${nextStyle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: style.order }),
        }),
      ]);

      toast.success('排序更新成功');
      router.refresh();

      // 重新获取数据
      const response = await fetch('/api/styles');
      const result = await response.json();
      setStyles(result.data);
      handleSearch(searchQuery);
    } catch (error) {
      toast.error('排序失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold">
            <Palette className="h-8 w-8" />
            风格管理
          </h2>
          <p className="text-muted-foreground">管理字体风格标签，用于字体筛选和分类</p>
        </div>
        <Button
          onClick={() => {
            setFormData({ name: '', description: '' });
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          添加风格
        </Button>
      </div>

      {/* 提示信息 */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-blue-600 dark:text-blue-400">
              <Palette className="h-5 w-5" />
            </div>
            <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
              <p className="mb-1 font-medium">关于风格管理</p>
              <p className="text-blue-800 dark:text-blue-200">
                风格标签用于字体列表页面的筛选功能。修改风格后，用户可以在前台按风格筛选字体。
                请确保风格名称简洁明了，便于用户理解和使用。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索风格
          </CardTitle>
          <CardDescription>按名称、Slug 或描述搜索风格标签</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="搜索风格..."
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

      {/* 风格列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>风格列表</CardTitle>
              <CardDescription>
                共 {filteredStyles.length} 个风格
                {searchQuery && ` (从 ${styles.length} 个中筛选)`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStyles.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              {searchQuery ? '没有找到匹配的风格' : '暂无风格数据'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">排序</TableHead>
                  <TableHead>风格名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>预览</TableHead>
                  <TableHead className="text-right">更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStyles.map((style, index) => (
                  <TableRow key={style.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(style, index)}
                          disabled={index === 0 || isSaving}
                          className="h-7 w-7 p-0"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(style, index)}
                          disabled={index === filteredStyles.length - 1 || isSaving}
                          className="h-7 w-7 p-0"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{style.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{style.slug}</code>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground max-w-xs truncate text-sm">
                        {style.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{style.name}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm">
                      {new Date(style.updatedAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStyleToEdit(style);
                            setFormData({
                              name: style.name,
                              description: style.description || '',
                            });
                            setEditDialogOpen(true);
                          }}
                          disabled={isSaving}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStyleToDelete(style);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={isSaving}
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

      {/* 创建风格对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加风格</DialogTitle>
            <DialogDescription>创建一个新的字体风格标签</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-style-name">风格名称 *</Label>
              <Input
                id="new-style-name"
                placeholder="例如：黑体、宋体、楷体等"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-style-description">描述（可选）</Label>
              <Textarea
                id="new-style-description"
                placeholder="简要描述该风格的特点"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setFormData({ name: '', description: '' });
              }}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? '保存中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑风格对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑风格</DialogTitle>
            <DialogDescription>修改风格标签信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-style-name">风格名称 *</Label>
              <Input
                id="edit-style-name"
                placeholder="例如：黑体、宋体、楷体等"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleEdit();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-style-description">描述（可选）</Label>
              <Textarea
                id="edit-style-description"
                placeholder="简要描述该风格的特点"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setStyleToEdit(null);
                setFormData({ name: '', description: '' });
              }}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? '保存中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除风格 &quot;{styleToDelete?.name}&quot; 吗？
              <br />
              <br />
              此操作无法撤销。删除后，使用该风格标签的字体将不再显示此标签。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => styleToDelete && handleDelete(styleToDelete)}
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
