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
import { Check, ExternalLink, FileText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export type FontCertRow = {
  id: string;
  fontKey: string;
  family?: string;
  normalized?: string;
  name?: string;
  fileName?: string;
  fileSize?: number;
  mime?: string;
  storedAs?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewNote?: string;
  ownerKeyHash: string;
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function statusBadge(status: FontCertRow['status']) {
  if (status === 'approved') return <Badge>已通过</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">已驳回</Badge>;
  return <Badge variant="secondary">待审核</Badge>;
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function fmtSize(n?: number) {
  const v = Number(n) || 0;
  if (v >= 1048576) return `${(v / 1048576).toFixed(1)} MB`;
  if (v >= 1024) return `${Math.round(v / 1024)} KB`;
  return v ? `${v} B` : '—';
}

interface FontCertsContentProps {
  initialList: FontCertRow[];
}

export function FontCertsContent({ initialList }: FontCertsContentProps) {
  const router = useRouter();
  const [list, setList] = useState<FontCertRow[]>(initialList);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approved' | 'rejected'>('approved');
  const [dialogRow, setDialogRow] = useState<FontCertRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const counts = useMemo(() => {
    const c = { all: list.length, pending: 0, approved: 0, rejected: 0 };
    for (const row of list) c[row.status] += 1;
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    return list.filter((r) => r.status === filter);
  }, [list, filter]);

  const openReview = (row: FontCertRow, action: 'approved' | 'rejected') => {
    setDialogRow(row);
    setDialogAction(action);
    setReviewNote('');
    setDialogOpen(true);
  };

  const submitReview = async () => {
    if (!dialogRow) return;
    setBusyId(dialogRow.id);
    try {
      const response = await fetch(`/api/admin/font-certs/${encodeURIComponent(dialogRow.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: dialogAction,
          reviewNote: reviewNote.trim() || undefined,
          reason: dialogAction === 'rejected' ? reviewNote.trim() || undefined : undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg =
          result?.error?.message || result?.message || `审核失败（${response.status}）`;
        throw new Error(msg);
      }
      const updated = (result?.data?.cert || result?.data) as FontCertRow | undefined;
      if (updated?.id) {
        setList((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      } else {
        setList((prev) =>
          prev.map((x) =>
            x.id === dialogRow.id
              ? {
                  ...x,
                  status: dialogAction,
                  reviewedAt: new Date().toISOString(),
                  reviewNote: reviewNote.trim(),
                  reason: dialogAction === 'rejected' ? reviewNote.trim() : '',
                }
              : x
          )
        );
      }
      toast.success(dialogAction === 'approved' ? '已通过 · 账号可开引用' : '已驳回');
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '审核失败');
    } finally {
      setBusyId(null);
    }
  };

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'pending', label: `待审核 (${counts.pending})` },
    { key: 'approved', label: `已通过 (${counts.approved})` },
    { key: 'rejected', label: `已驳回 (${counts.rejected})` },
    { key: 'all', label: `全部 (${counts.all})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">证书开引用审核</h2>
        <p className="text-muted-foreground">
          cite-closed 字用户上传的授权证明。通过后仅对该 API Key 开引用，不灌 fonts-packages CDN。
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>工单列表</CardTitle>
          <CardDescription>核对证书是否覆盖网页字体嵌入 / webfont</CardDescription>
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
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">暂无工单</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>字体</TableHead>
                  <TableHead>证明</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name || row.fontKey}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.fontKey}
                        {row.family ? ` · ${row.family}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.storedAs ? (
                        <a
                          href={`/api/admin/font-certs/${encodeURIComponent(row.id)}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {row.fileName || '打开'}
                          <span className="text-muted-foreground">({fmtSize(row.fileSize)})</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">未上传</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {statusBadge(row.status)}
                      {row.status === 'rejected' && row.reason ? (
                        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground line-clamp-2">
                          {row.reason}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{fmtTime(row.submittedAt)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(row.ownerKeyHash || '').slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === row.id}
                            onClick={() => openReview(row, 'approved')}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === row.id}
                            onClick={() => openReview(row, 'rejected')}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            驳回
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {fmtTime(row.reviewedAt)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approved' ? '通过证书' : '驳回证书'}
            </DialogTitle>
            <DialogDescription>
              {dialogRow
                ? `${dialogRow.name || dialogRow.fontKey}（${dialogRow.fontKey}）`
                : ''}
              {dialogAction === 'approved'
                ? ' — 通过后该 API Key 可对这款字开引用（preview CSS，不灌 CDN）。'
                : ' — 请写明驳回原因（将回显给用户）。'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={
              dialogAction === 'approved'
                ? '可选备注'
                : '例如：证书未覆盖网页字体嵌入 / webfont 用途'
            }
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant={dialogAction === 'approved' ? 'default' : 'destructive'}
              disabled={!!busyId}
              onClick={() => void submitReview()}
            >
              确认{dialogAction === 'approved' ? '通过' : '驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
