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
import { Check, ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export type ClaimRow = {
  id: string;
  slug: string;
  name: string;
  kind?: string;
  kindLabel?: string;
  website?: string;
  email?: string;
  licenseUrl?: string;
  proofUrl?: string;
  platformNoteUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string | null;
  reviewNote?: string;
  ownerKeyHash: string;
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_LABEL: Record<ClaimRow['status'], string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

function statusBadge(status: ClaimRow['status']) {
  if (status === 'approved') return <Badge>已通过</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">已拒绝</Badge>;
  return <Badge variant="secondary">待审核</Badge>;
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function linkCell(url?: string) {
  const u = String(url || '').trim();
  if (!u) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={u}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
    >
      打开
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

interface ClaimsContentProps {
  initialList: ClaimRow[];
}

export function ClaimsContent({ initialList }: ClaimsContentProps) {
  const router = useRouter();
  const [list, setList] = useState<ClaimRow[]>(initialList);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approved' | 'rejected'>('approved');
  const [dialogClaim, setDialogClaim] = useState<ClaimRow | null>(null);
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

  const openReview = (claim: ClaimRow, action: 'approved' | 'rejected') => {
    setDialogClaim(claim);
    setDialogAction(action);
    setReviewNote('');
    setDialogOpen(true);
  };

  const submitReview = async () => {
    if (!dialogClaim) return;
    setBusyId(dialogClaim.id);
    try {
      const response = await fetch(`/api/admin/claims/${encodeURIComponent(dialogClaim.id)}`, {
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
      const updated = (result?.data?.claim || result?.data) as ClaimRow | undefined;
      if (updated?.id) {
        setList((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      } else {
        setList((prev) =>
          prev.map((x) =>
            x.id === dialogClaim.id
              ? {
                  ...x,
                  status: dialogAction,
                  reviewedAt: new Date().toISOString(),
                  reviewNote: reviewNote.trim(),
                }
              : x
          )
        );
      }
      toast.success(dialogAction === 'approved' ? '已通过并回写认领状态' : '已拒绝');
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
    { key: 'rejected', label: `已拒绝 (${counts.rejected})` },
    { key: 'all', label: `全部 (${counts.all})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">厂商认领审核</h2>
        <p className="text-muted-foreground">
          审核通过后写入认领覆盖层；若配置了 FOUNDRIES_JSON_PATH 会尝试回写 foundries.json
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>工单列表</CardTitle>
          <CardDescription>按状态筛选；待审核可一键通过或拒绝</CardDescription>
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
                  <TableHead className="min-w-[140px]">厂商</TableHead>
                  <TableHead className="min-w-[100px]">类型</TableHead>
                  <TableHead className="min-w-[160px]">联系</TableHead>
                  <TableHead className="min-w-[80px]">证明</TableHead>
                  <TableHead className="min-w-[90px]">状态</TableHead>
                  <TableHead className="min-w-[140px]">提交时间</TableHead>
                  <TableHead className="min-w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                      暂无工单
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-muted-foreground font-mono text-xs">{row.slug}</div>
                            <div className="text-muted-foreground font-mono text-[10px]">
                              {row.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{row.kindLabel || row.kind || '—'}</div>
                          {row.website ? linkCell(row.website) : null}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm break-all">{row.email || '—'}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">
                            key {row.ownerKeyHash.slice(0, 8)}…
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {linkCell(row.proofUrl)}
                            {row.licenseUrl ? (
                              <span className="text-xs">{linkCell(row.licenseUrl)} 许可</span>
                            ) : null}
                            {row.platformNoteUrl ? (
                              <span className="text-xs">{linkCell(row.platformNoteUrl)} 平台</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {statusBadge(row.status)}
                          {row.reviewNote ? (
                            <div className="text-muted-foreground mt-1 max-w-[12rem] truncate text-xs">
                              {row.reviewNote}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{fmtTime(row.submittedAt)}</div>
                          {row.reviewedAt ? (
                            <div className="text-muted-foreground text-xs">
                              审 {fmtTime(row.reviewedAt)}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.status === 'pending' ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => openReview(row, 'approved')}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => openReview(row, 'rejected')}
                              >
                                <X className="mr-1 h-4 w-4" />
                                拒绝
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {STATUS_LABEL[row.status]}
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
              {dialogAction === 'approved' ? '通过认领' : '拒绝认领'}
              {dialogClaim ? ` · ${dialogClaim.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'approved'
                ? '通过后该厂商页会显示已认领（覆盖层即时生效）。'
                : '拒绝后申请人可再次提交。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="review-note">
              审核备注（可选）
            </label>
            <Textarea
              id="review-note"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="写给内部或申请人的说明"
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant={dialogAction === 'rejected' ? 'destructive' : 'default'}
              disabled={!!busyId}
              onClick={() => void submitReview()}
            >
              确认{dialogAction === 'approved' ? '通过' : '拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
