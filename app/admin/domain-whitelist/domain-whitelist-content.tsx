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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Edit, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Item = {
    id: string;
    domain: string;
    note: string | null;
    isActive: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
};

interface DomainWhitelistContentProps {
    initialList: Item[];
    variant?: 'page' | 'embedded';
}

const getStatusBadge = (isActive: boolean) => {
    if (isActive) return <Badge>已授权</Badge>;
    return <Badge variant="secondary">已停用</Badge>;
};

export function DomainWhitelistContent({ initialList, variant = 'page' }: DomainWhitelistContentProps) {
    const router = useRouter();
    const [list, setList] = useState<Item[]>(initialList);
    const [domain, setDomain] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const [editNote, setEditNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const sortedList = useMemo(
        () => [...list].sort((a, b) => a.domain.localeCompare(b.domain)),
        [list]
    );

    const handleAdd = async () => {
        if (!domain.trim()) {
            toast.error('请输入域名');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/admin/domain-whitelist', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    domain: domain.trim(),
                    note: note.trim() || null,
                    isActive: true,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result?.message || '添加失败');
            setList((prev) => [...prev, result.data as Item]);
            setDomain('');
            setNote('');
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
            const response = await fetch('/api/admin/domain-whitelist', {
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

    const handleOpenEdit = (item: Item) => {
        setItemToEdit(item);
        setEditNote(item.note || '');
        setEditOpen(true);
    };

    const handleSave = async () => {
        if (!itemToEdit) return;
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/domain-whitelist', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id: itemToEdit.id, note: editNote.trim() || null }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result?.message || '更新失败');
            const updated = result.data as Item;
            setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            toast.success('保存成功');
            router.refresh();
            setEditOpen(false);
            setItemToEdit(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '更新失败');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/domain-whitelist/${itemToDelete.id}`, {
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
                    <h2 className="text-3xl font-bold">域名白名单</h2>
                    <p className="text-muted-foreground">
                        白名单中的域名可免密钥访问字体 API（需完全匹配域名），且支持分钟级限流保护系统
                    </p>
                </div>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        添加白名单
                    </CardTitle>
                    <CardDescription>支持输入域名或完整 URL，会自动规范化为 hostname</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="md:col-span-1">
                            <Input
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="example.com"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（可选）" />
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
                    <CardTitle>白名单列表</CardTitle>
                    <CardDescription>共 {sortedList.length} 条</CardDescription>
                </CardHeader>
                <CardContent>
                    {sortedList.length === 0 ? (
                        <div className="text-muted-foreground py-12 text-center">暂无白名单</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[220px]">域名</TableHead>
                                        <TableHead className="min-w-[260px]">备注</TableHead>
                                        <TableHead className="min-w-[120px]">状态</TableHead>
                                        <TableHead className="min-w-[260px]">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedList.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-xs">{item.domain}</TableCell>
                                            <TableCell className="text-sm">{item.note || '—'}</TableCell>
                                            <TableCell>{getStatusBadge(item.isActive)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        编辑
                                                    </Button>
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

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑白名单</DialogTitle>
                        <DialogDescription>{itemToEdit?.domain}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <div className="text-sm font-medium">备注</div>
                        <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="备注（可选）" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
                            取消
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除？</AlertDialogTitle>
                        <AlertDialogDescription>删除后该域名将恢复为常规访问策略。</AlertDialogDescription>
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
