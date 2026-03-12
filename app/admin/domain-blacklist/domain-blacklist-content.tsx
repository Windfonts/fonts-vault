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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, ShieldBan, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Item = {
  id: string;
  domain: string;
  reason: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

interface DomainBlacklistContentProps {
  initialList: Item[];
  mode?: 'domain' | 'ip';
  variant?: 'page' | 'embedded';
}

const getStatusBadge = (isActive: boolean) => {
  if (isActive) return <Badge variant="destructive">启用拦截</Badge>;
  return <Badge variant="secondary">已停用</Badge>;
};

export function DomainBlacklistContent({
  initialList,
  mode = 'domain',
  variant = 'page',
}: DomainBlacklistContentProps) {
  const router = useRouter();
  const [list, setList] = useState<Item[]>(initialList);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedList = useMemo(
    () => [...list].sort((a, b) => a.domain.localeCompare(b.domain)),
    [list]
  );

  const handleAdd = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(mode === 'ip' ? '请输入 IP' : '请输入域名');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/domain-blacklist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          domain: trimmed,
          reason: reason.trim() || null,
          isActive: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || '添加失败');
      setList((prev) => [...prev, result.data as Item]);
      setValue('');
      setReason('');
      toast.success('添加成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: Item) => {
    try {
      const response = await fetch('/api/admin/domain-blacklist', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || '更新失败');
      const updated = result.data as Item;
      setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('更新成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/domain-blacklist/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || '删除失败');
      setList((prev) => prev.filter((x) => x.id !== itemToDelete.id));
      toast.success('删除成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {variant === 'page' ? (
        <div>
          <h2 className="text-3xl font-bold">{mode === 'ip' ? 'IP 黑名单' : '域名黑名单'}</h2>
          <p className="text-muted-foreground">
            {mode === 'ip'
              ? '被加入黑名单的 IP 即使使用有效密钥也无法调用 API'
              : '被加入黑名单的域名即使使用有效密钥也无法调用 API'}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldBan className="h-5 w-5" />
            添加黑名单
          </CardTitle>
          <CardDescription>
            {mode === 'ip' ? '仅支持单个 IP（IPv4/IPv6）' : '支持输入域名或完整 URL，会自动规范化为 hostname'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'ip' ? '1.1.1.1' : 'example.com'}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="原因（可选）"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleAdd} disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? '添加中...' : '添加'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>黑名单列表</CardTitle>
          <CardDescription>共 {sortedList.length} 条</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedList.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">暂无黑名单</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">{mode === 'ip' ? 'IP' : '域名'}</TableHead>
                    <TableHead className="min-w-[260px]">原因</TableHead>
                    <TableHead className="min-w-[120px]">状态</TableHead>
                    <TableHead className="min-w-[220px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.domain}</TableCell>
                      <TableCell className="text-sm">{item.reason || '—'}</TableCell>
                      <TableCell>{getStatusBadge(item.isActive)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleToggle(item)}>
                            {item.isActive ? '停用' : '启用'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将立即解除该{mode === 'ip' ? 'IP' : '域名'}的屏蔽。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '处理中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
