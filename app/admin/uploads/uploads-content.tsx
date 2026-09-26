'use client';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Check, Download, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { AdminUploadRow } from '@/lib/services/console-uploads.service';

type StatusFilter = 'queued' | 'ready' | 'rejected' | 'all';

const STATUS_LABEL: Record<string, string> = {
  pending_upload: '待传文件',
  processing: '待审核',
  ready: '已通过',
  rejected: '已拒绝',
};

function statusBadge(status: string, reviewState?: string) {
  if (status === 'ready') return <Badge>已通过</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">已拒绝</Badge>;
  if (status === 'processing' || reviewState === 'queued') {
    return <Badge variant="secondary">待审核</Badge>;
  }
  return <Badge variant="outline">{STATUS_LABEL[status] || status}</Badge>;
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function fmtBytes(n: number) {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

interface UploadsContentProps {
  initialList: AdminUploadRow[];
}

export function UploadsContent({ initialList }: UploadsContentProps) {
  const router = useRouter();
  const [list, setList] = useState<AdminUploadRow[]>(initialList);
  const [filter, setFilter] = useState<StatusFilter>('queued');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approved' | 'rejected'>('approved');
  const [dialogRow, setDialogRow] = useState<AdminUploadRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const counts = useMemo(() => {
    const c = { all: list.length, queued: 0, ready: 0, rejected: 0 };
    for (const row of list) {
      if (row.status === 'ready') c.ready += 1;
      else if (row.status === 'rejected') c.rejected += 1;
      else if (row.status === 'processing') c.queued += 1;
    }
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    if (filter === 'queued') return list.filter((r) => r.status === 'processing');
    if (filter === 'ready') return list.filter((r) => r.status === 'ready');
    return list.filter((r) => r.status === 'rejected');
  }, [list, filter]);

  const openReview = (row: AdminUploadRow, action: 'approved' | 'rejected') => {
    setDialogRow(row);
    setDialogAction(action);
    setReviewNote('');
    setDialogOpen(true);
  };

  const submitReview = async () => {
    if (!dialogRow) return;
    setBusyId(dialogRow.id);
    try {
      const response = await fetch(`/api/admin/uploads/${encodeURIComponent(dialogRow.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: dialogAction,
          reviewNote: reviewNote.trim() || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg =
          result?.error?.message || result?.message || `审核失败（${response.status}）`;
        throw new Error(msg);
      }
      const updated = (result?.data?.upload || result?.data) as AdminUploadRow | undefined;
      if (updated?.id) {
        setList((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      }
      toast.success(
        dialogAction === 'approved'
          ? result?.message || '已通过'
          : '已拒绝'
      );
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '审核失败');
    } finally {
      setBusyId(null);
    }
  };

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'queued', label: `待审核 (${counts.queued})` },
    { key: 'ready', label: `已通过 (${counts.ready})` },
    { key: 'rejected', label: `已拒绝 (${counts.rejected})` },
    { key: 'all', label: `全部 (${counts.all})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">自有字上传审核</h2>
        <p className="text-muted-foreground">
          用户 complete 后进入待审核；通过时推 OSS（console-uploads/…），未配置密钥则仅标 ready
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>上传队列</CardTitle>
          <CardDescription>可下载字重与授权证明后再通过或拒绝</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">名称 / 家族</TableHead>
                  <TableHead className="min-w-[100px]">许可</TableHead>
                  <TableHead className="min-w-[120px]">字重</TableHead>
                  <TableHead className="min-w-[80px]">大小</TableHead>
                  <TableHead className="min-w-[90px]">状态</TableHead>
                  <TableHead className="min-w-[140px]">提交时间</TableHead>
                  <TableHead className="min-w-[220px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                      暂无记录
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const busy = busyId === row.id;
                    const canReview = row.status === 'processing';
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-muted-foreground text-xs font-mono">
                            {row.family} · {row.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{row.license}</div>
                          {row.proofReceived ? (
                            <a
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
                              href={`/api/admin/uploads/${encodeURIComponent(row.id)}/files/proof`}
                            >
                              证明 <Download className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">无证明</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {row.files.map((f) => (
                              <a
                                key={f.weight}
                                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                href={`/api/admin/uploads/${encodeURIComponent(row.id)}/files/${encodeURIComponent(f.weight)}`}
                              >
                                {f.weight} <Download className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{fmtBytes(row.size)}</TableCell>
                        <TableCell>{statusBadge(row.status, row.review?.state)}</TableCell>
                        <TableCell className="text-sm">{fmtTime(row.uploadedAt)}</TableCell>
                        <TableCell>
                          {canReview ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => openReview(row, 'approved')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => openReview(row, 'rejected')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                拒绝
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {row.review?.note || '—'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approved' ? '通过上传' : '拒绝上传'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'approved'
                ? '通过后将字体与证明推到 OSS（若已配置密钥），并标为 ready。'
                : '拒绝后用户侧状态为 rejected，本地文件保留以便复查。'}
            </DialogDescription>
          </DialogHeader>
          {dialogRow ? (
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">字体：</span>
                {dialogRow.name}（{dialogRow.family}）
              </div>
              <div>
                <span className="text-muted-foreground">许可：</span>
                {dialogRow.license}
              </div>
            </div>
          ) : null}
          <Textarea
            placeholder="审核备注（可选）"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant={dialogAction === 'rejected' ? 'destructive' : 'default'}
              disabled={!!busyId}
              onClick={submitReview}
            >
              {dialogAction === 'approved' ? '确认通过' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
