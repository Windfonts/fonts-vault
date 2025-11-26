'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SyncResult {
  added: number;
  updated: number;
  failed: number;
  failedDetails: string[];
  timestamp: string;
  duration?: number;
}

interface SyncHistoryItem extends SyncResult {
  id: string;
  status: 'success' | 'partial' | 'failed';
}

export function SyncManagementContent() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentResult, setCurrentResult] = useState<SyncResult | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [progress, setProgress] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string>('');
  const [metadataPreview, setMetadataPreview] = useState<
    Array<{
      normalizedName: string;
      name: string;
      fontFamily: string;
      version: string;
      fontCategory?: string;
      foundry?: string;
      licenseType?: string;
      tags?: string[];
      languages?: string[];
      weightsSummary: Array<{
        weightName: string;
        fontWeight: number;
        versions: Array<{ name: string; file: string; charCount: number; glyphCount: number }>;
      }>;
      analysis?: any;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPreviewLoading(true);
        setPreviewError('');
        const res = await fetch('/api/sync?limit=50');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '获取预览失败');
        if (!cancelled) setMetadataPreview(data.data || []);
      } catch (e) {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : '未知错误');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setProgress('正在连接到OSS...');
    setCurrentResult(null);

    const startTime = Date.now();

    try {
      setProgress('正在同步字体数据...');

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '同步失败');
      }

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        ...data.data,
        timestamp: new Date().toISOString(),
        duration,
      };

      setCurrentResult(result);
      setProgress('');

      // 添加到历史记录
      const historyItem: SyncHistoryItem = {
        ...result,
        id: Date.now().toString(),
        status:
          result.failed === 0
            ? 'success'
            : result.added + result.updated > 0
              ? 'partial'
              : 'failed',
      };

      setSyncHistory((prev) => [historyItem, ...prev.slice(0, 9)]);

      // 显示成功提示
      if (result.failed === 0) {
        toast.success('同步完成', {
          description: `新增 ${result.added} 个，更新 ${result.updated} 个`,
        });
      } else {
        toast.warning('同步部分完成', {
          description: `成功 ${result.added + result.updated} 个，失败 ${result.failed} 个`,
        });
      }
    } catch (error) {
      console.error('同步失败:', error);
      setProgress('');

      const errorResult: SyncResult = {
        added: 0,
        updated: 0,
        failed: 1,
        failedDetails: [error instanceof Error ? error.message : '未知错误'],
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };

      setCurrentResult(errorResult);

      // 添加到历史记录
      const historyItem: SyncHistoryItem = {
        ...errorResult,
        id: Date.now().toString(),
        status: 'failed',
      };

      setSyncHistory((prev) => [historyItem, ...prev.slice(0, 9)]);

      toast.error('同步失败', {
        description: error instanceof Error ? error.message : '请检查网络连接和配置',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: SyncHistoryItem['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            成功
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-500">
            <AlertCircle className="mr-1 h-3 w-3" />
            部分成功
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            失败
          </Badge>
        );
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-3xl font-bold">同步管理</h2>
        <p className="text-muted-foreground">从OSS同步字体列表，管理字体数据更新</p>
      </div>

      {/* 同步操作卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            手动同步
          </CardTitle>
          <CardDescription>从OSS读取最新的字体映射文件并同步到数据库</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={handleSync} disabled={isSyncing} size="lg" className="min-w-[200px]">
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  同步中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  开始同步
                </>
              )}
            </Button>

            {progress && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {progress}
              </div>
            )}
          </div>

          {/* 同步说明 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>同步说明</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>同步操作会从OSS读取最新的字体映射JSON文件</li>
                <li>已存在的字体会被更新，新字体会被添加到数据库</li>
                <li>同步过程中会自动创建缺失的分类和品牌</li>
                <li>同步操作是幂等的，可以安全地多次执行</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            OSS元数据预览
          </CardTitle>
          <CardDescription>展示从 OSS 读取到的字体元信息（部分字段）</CardDescription>
        </CardHeader>
        <CardContent>
          {previewLoading ? (
            <div className="text-muted-foreground py-6 text-sm">正在加载预览...</div>
          ) : previewError ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>加载失败</AlertTitle>
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          ) : metadataPreview.length === 0 ? (
            <div className="text-muted-foreground py-6 text-sm">暂无预览数据</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">名称</TableHead>
                      <TableHead className="min-w-[150px]">标准化名称</TableHead>
                      <TableHead className="min-w-[120px]">族名</TableHead>
                      <TableHead className="min-w-[80px]">版本</TableHead>
                      <TableHead className="min-w-[100px]">分类</TableHead>
                      <TableHead className="min-w-[100px]">品牌</TableHead>
                      <TableHead className="min-w-[80px]">授权</TableHead>
                      <TableHead className="min-w-[200px]">标签</TableHead>
                      <TableHead className="min-w-[150px]">语言</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metadataPreview.map((item) => (
                      <TableRow key={item.normalizedName}>
                        <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {item.normalizedName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{item.fontFamily}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{item.version}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {item.fontCategory || '-'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {item.foundry || '-'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {item.licenseType || '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {(item.tags || []).join(', ')}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm">
                          {(item.languages || []).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-muted-foreground text-sm">字重与版本详情</div>
              <div className="space-y-2">
                {metadataPreview.slice(0, 5).map((item) => (
                  <div key={item.normalizedName} className="rounded-lg border p-4">
                    <div className="mb-2 text-sm font-medium">
                      {item.name}（{item.normalizedName}）
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {item.weightsSummary.map((w) => (
                        <div key={w.weightName} className="bg-muted rounded-md p-3">
                          <div className="text-sm font-medium">
                            {w.weightName}（{w.fontWeight}）
                          </div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {w.versions.map((v) => (
                              <div key={v.name} className="flex items-center justify-between">
                                <span>{v.name}</span>
                                <span className="ml-2">
                                  chars: {v.charCount} / glyphs: {v.glyphCount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {item.analysis && (
                      <div className="text-muted-foreground mt-2 text-xs">已加载分析数据</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 当前同步结果 */}
      {currentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              同步结果
            </CardTitle>
            <CardDescription>
              {new Date(currentResult.timestamp).toLocaleString('zh-CN')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">新增</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="mt-2 text-2xl font-bold">{currentResult.added}</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">更新</span>
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                </div>
                <div className="mt-2 text-2xl font-bold">{currentResult.updated}</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">失败</span>
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <div className="mt-2 text-2xl font-bold">{currentResult.failed}</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">耗时</span>
                  <Clock className="text-muted-foreground h-4 w-4" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {formatDuration(currentResult.duration)}
                </div>
              </div>
            </div>

            {/* 失败详情 */}
            {currentResult.failedDetails && currentResult.failedDetails.length > 0 && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>同步失败详情</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 max-h-[200px] overflow-y-auto">
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {currentResult.failedDetails.map((error, index) => (
                          <li key={index} className="break-all">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 同步历史记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            同步历史
          </CardTitle>
          <CardDescription>最近10次同步操作记录</CardDescription>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">暂无同步历史记录</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">时间</TableHead>
                    <TableHead className="min-w-[100px]">状态</TableHead>
                    <TableHead className="min-w-[80px] text-right">新增</TableHead>
                    <TableHead className="min-w-[80px] text-right">更新</TableHead>
                    <TableHead className="min-w-[80px] text-right">失败</TableHead>
                    <TableHead className="min-w-[80px] text-right">耗时</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-green-600">+{item.added}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-blue-600">{item.updated}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.failed > 0 ? (
                          <span className="font-medium text-red-600">{item.failed}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm whitespace-nowrap">
                        {formatDuration(item.duration)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 同步日志说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            同步日志
          </CardTitle>
          <CardDescription>查看详细的同步操作日志</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>日志位置</AlertTitle>
            <AlertDescription>
              <p className="mt-2 text-sm">详细的同步日志记录在服务器端，可以通过以下方式查看：</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>开发环境：查看控制台输出</li>
                <li>生产环境：查看应用日志文件</li>
                <li>日志包含每个字体的处理状态、错误信息和性能指标</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
