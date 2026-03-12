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
import { Copy, KeyRound, Plus, RefreshCw, Search, ShieldOff, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Plan = {
  id: string;
  name: string;
  slug: string;
  dailyQuota: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type KeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  checksum: string;
  ownerEmail: string | null;
  status: 'active' | 'revoked';
  revokedAt: string | Date | null;
  expiresAt: string | Date | null;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  planId: string | null;
  planName: string | null;
  planSlug: string | null;
  planDailyQuota: number | null;
  planActive: boolean | null;
};

interface ApiKeyManagementContentProps {
  initialKeys: KeyItem[];
  initialPlans: Plan[];
}

type ApiKeyStatusOk = {
  code: 200;
  data: {
    valid: true;
    key: {
      id: string;
      name: string;
      ownerEmail: string | null;
      expiresAt: string | null;
      plan: { id: string; name: string; slug: string; dailyQuota: number } | null;
    };
    quota: { limit: number; used: number; remaining: number };
    day: string;
    domain: string;
  };
  message: string;
};

type ApiKeyStatusFail = {
  code: number;
  errorCode: string;
  message: string;
};

type ApiKeyStatusResult = ApiKeyStatusOk | ApiKeyStatusFail;

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const getStatusBadge = (status: KeyItem['status']) => {
  if (status === 'active') return <Badge>启用</Badge>;
  return <Badge variant="destructive">已吊销</Badge>;
};

export function ApiKeyManagementContent({
  initialKeys,
  initialPlans,
}: ApiKeyManagementContentProps) {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyItem[]>(initialKeys);
  const [plans] = useState<Plan[]>(initialPlans);
  const [searchQuery, setSearchQuery] = useState('');

  const [testKey, setTestKey] = useState('');
  const [testResult, setTestResult] = useState<ApiKeyStatusResult | null>(null);
  const [testHttpStatus, setTestHttpStatus] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdKeyOpen, setCreatedKeyOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPrefix, setNewPrefix] = useState('live');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newPlanId, setNewPlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [newExpiresAt, setNewExpiresAt] = useState('');

  const [revokeOpen, setRevokeOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<KeyItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const filteredKeys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((k) => {
      const name = k.name.toLowerCase();
      const email = (k.ownerEmail || '').toLowerCase();
      const prefix = (k.keyPrefix || '').toLowerCase();
      const plan = (k.planSlug || '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        prefix.includes(q) ||
        plan.includes(q) ||
        k.id.includes(q)
      );
    });
  }, [keys, searchQuery]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleTestKey = async () => {
    const raw = testKey.trim();
    if (!raw) {
      toast.error('请输入要验证的密钥');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestHttpStatus(null);
    try {
      const response = await fetch('/api/key/status', {
        method: 'GET',
        headers: { 'x-api-key': raw },
      });

      const result = (await response.json()) as ApiKeyStatusResult;
      setTestHttpStatus(response.status);
      setTestResult(result);

      if (response.ok) {
        toast.success('密钥有效');
        return;
      }
      toast.error(result?.message || '密钥无效');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '验证失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('请输入密钥名称');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          keyPrefix: newPrefix.trim(),
          ownerEmail: newOwnerEmail.trim() || null,
          planId: newPlanId,
          expiresAt: newExpiresAt || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || '生成失败');

      const apiKey = result.data.apiKey as KeyItem;
      const plaintextKey = result.data.plaintextKey as string;

      setKeys((prev) => [apiKey, ...prev]);
      setCreatedKey(plaintextKey);
      setCreatedKeyOpen(true);
      setCreateOpen(false);
      setNewName('');
      setNewOwnerEmail('');
      setNewPrefix('live');
      setNewExpiresAt('');
      toast.success('密钥已生成');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!keyToRevoke) return;
    setIsRevoking(true);
    try {
      const response = await fetch(`/api/admin/api-keys/${keyToRevoke.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || '吊销失败');

      const updated = result.data as KeyItem;
      setKeys((prev) => prev.map((k) => (k.id === updated.id ? { ...k, ...updated } : k)));
      toast.success('吊销成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '吊销失败');
    } finally {
      setIsRevoking(false);
      setRevokeOpen(false);
      setKeyToRevoke(null);
    }
  };

  const handleRotate = async (item: KeyItem) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'rotate' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || '轮换失败');

      const apiKey = result.data.apiKey as KeyItem;
      const plaintextKey = result.data.plaintextKey as string;
      const revokedKeyId = result.data.revokedKeyId as string;

      setKeys((prev) => [
        apiKey,
        ...prev.map((k) => (k.id === revokedKeyId ? { ...k, status: 'revoked' as const } : k)),
      ]);
      setCreatedKey(plaintextKey);
      setCreatedKeyOpen(true);
      toast.success('轮换成功');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '轮换失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">API 密钥</h2>
          <p className="text-muted-foreground">生成、分发并管理字体 API 密钥</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          生成密钥
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索密钥
          </CardTitle>
          <CardDescription>按名称、邮箱、前缀、套餐或 ID 搜索</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                <X className="mr-2 h-4 w-4" />
                清除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            密钥校验测试
          </CardTitle>
          <CardDescription>会调用 /api/key/status（每次验证会计入调用次数）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">API Key</div>
              <Input
                value={testKey}
                onChange={(e) => setTestKey(e.target.value)}
                placeholder="wf_xxx_xxx_xxxx"
                aria-label="输入要验证的 API Key"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleTestKey} disabled={isTesting}>
                {isTesting ? '验证中...' : '验证'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTestKey('');
                  setTestResult(null);
                  setTestHttpStatus(null);
                }}
                disabled={isTesting}
              >
                清空
              </Button>
            </div>

            {testHttpStatus != null && (
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">HTTP</div>
                {testHttpStatus >= 200 && testHttpStatus < 300 ? (
                  <Badge> {testHttpStatus} </Badge>
                ) : (
                  <Badge variant="destructive"> {testHttpStatus} </Badge>
                )}
              </div>
            )}

            {testResult && (
              <div className="space-y-2">
                <div className="text-sm font-medium">响应</div>
                <pre className="bg-muted max-h-[320px] overflow-auto rounded-md p-3 text-xs">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            密钥列表
          </CardTitle>
          <CardDescription>共 {filteredKeys.length} 条</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredKeys.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">暂无密钥</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">名称</TableHead>
                    <TableHead className="min-w-[160px]">邮箱</TableHead>
                    <TableHead className="min-w-[110px]">状态</TableHead>
                    <TableHead className="min-w-[160px]">套餐</TableHead>
                    <TableHead className="min-w-[170px]">到期</TableHead>
                    <TableHead className="min-w-[170px]">最近使用</TableHead>
                    <TableHead className="min-w-[170px]">创建时间</TableHead>
                    <TableHead className="min-w-[220px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-muted-foreground font-mono text-xs">{item.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>{item.ownerEmail || '—'}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.planName ? (
                          <div className="space-y-1">
                            <div className="font-medium">{item.planName}</div>
                            <div className="text-muted-foreground text-xs">
                              {item.planDailyQuota ?? '—'} / 天
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">默认</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(item.expiresAt)}</TableCell>
                      <TableCell>{formatDateTime(item.lastUsedAt)}</TableCell>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRotate(item)}
                            disabled={item.status !== 'active'}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            轮换
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setKeyToRevoke(item);
                              setRevokeOpen(true);
                            }}
                            disabled={item.status !== 'active'}
                          >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            吊销
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>生成 API 密钥</DialogTitle>
            <DialogDescription>密钥只会在生成后展示一次，请及时复制保存</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">名称</div>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：官网前端"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">前缀</div>
                <Input
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value)}
                  placeholder="live"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">套餐</div>
                <Select value={newPlanId ?? ''} onValueChange={(v) => setNewPlanId(v || null)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择套餐" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}（{p.dailyQuota}/天）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">分发邮箱（可选）</div>
              <Input
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">到期时间（可选）</div>
              <Input
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                placeholder="YYYY-MM-DD 或 2026-12-31T00:00:00Z"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? '生成中...' : '生成'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createdKeyOpen} onOpenChange={setCreatedKeyOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>密钥已生成</DialogTitle>
            <DialogDescription>请立即复制保存，此窗口关闭后将无法再次查看明文</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={createdKey || ''} readOnly />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => createdKey && handleCopy(createdKey)}
                disabled={!createdKey}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制密钥
              </Button>
              <Button onClick={() => setCreatedKeyOpen(false)}>关闭</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认吊销该密钥？</AlertDialogTitle>
            <AlertDialogDescription>
              吊销后，该密钥将立即失效，无法再调用 API。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={isRevoking}>
              {isRevoking ? '处理中...' : '确认吊销'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
