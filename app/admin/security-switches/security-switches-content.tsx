'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Item = {
    id: string;
    key: string;
    enabled: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
};

interface SecuritySwitchesContentProps {
    initialList: Item[];
    variant?: 'page' | 'dashboard';
}

const KEY_LABEL: Record<string, string> = {
    domain_blacklist: '域名黑名单过滤',
    domain_whitelist: '域名白名单免密钥',
    ip_whitelist: 'IP 白名单免密钥',
    api_key_auth: 'API Key 认证',
    whitelist_rate_limit: '白名单分钟限流',
    anonymous_daily_quota: '匿名日配额限制',
};

export function SecuritySwitchesContent({
    initialList,
    variant = 'page',
}: SecuritySwitchesContentProps) {
    const router = useRouter();
    const [list, setList] = useState<Item[]>(initialList);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const sorted = useMemo(() => [...list].sort((a, b) => a.key.localeCompare(b.key)), [list]);

    const handleToggle = async (item: Item) => {
        setSavingKey(item.key);
        try {
            const response = await fetch('/api/admin/security-switches', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    key: item.key,
                    enabled: !item.enabled,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result?.message || '更新失败');
            setList((prev) => prev.map((x) => (x.key === item.key ? (result.data as Item) : x)));
            toast.success('更新成功');
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '更新失败');
        } finally {
            setSavingKey(null);
        }
    };

    const table = (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[220px]">功能</TableHead>
                        <TableHead className="min-w-[160px]">状态</TableHead>
                        <TableHead className="min-w-[220px]">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((item) => {
                        const isSaving = savingKey === item.key;
                        return (
                            <TableRow key={item.key}>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="font-medium">{KEY_LABEL[item.key] || item.key}</div>
                                        <div className="text-muted-foreground font-mono text-xs">{item.key}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.enabled ? <Badge>启用</Badge> : <Badge variant="secondary">停用</Badge>}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggle(item)}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? '处理中...' : item.enabled ? '一键停用' : '一键启用'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );

    if (variant === 'dashboard') {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle>安全开关</CardTitle>
                            <CardDescription>鉴权、白名单、黑名单与限流的统一开关</CardDescription>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/security-switches">进入管理页</Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>{table}</CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">安全开关</h2>
                <p className="text-muted-foreground">统一管理鉴权、白名单、黑名单与限流功能的启用/停用</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>开关列表</CardTitle>
                    <CardDescription>修改后将自动生效（服务端有短暂缓存）</CardDescription>
                </CardHeader>
                <CardContent>{table}</CardContent>
            </Card>
        </div>
    );
}
