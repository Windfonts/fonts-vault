import { AdminLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { requireAuth } from '@/lib/auth/session';
import { fontService } from '@/lib/services/font.service';
import { ArrowLeft, Calendar, Download, Edit, Eye } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FontDetailPage({ params }: PageProps) {
  await requireAuth();

  const { id } = await params;

  // 获取字体详情（带关联数据）- 使用 normalizedName
  const font = await fontService.findByNormalizedNameWithRelations(id);
  if (!font) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 返回按钮和操作 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/admin/fonts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回字体列表
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/admin/fonts/${font.normalizedName}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </Link>
            </Button>
          </div>
        </div>

        {/* 页面标题 */}
        <div>
          <h2 className="text-3xl font-bold">{font.name}</h2>
          {font.englishName && <p className="text-muted-foreground text-lg">{font.englishName}</p>}
        </div>

        {/* 统计信息 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">浏览量</CardTitle>
              <Eye className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{font.viewCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">下载量</CardTitle>
              <Download className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{font.downloadCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API 调用</CardTitle>
              <Calendar className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{font.apiCallCount.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-muted-foreground text-sm font-medium">字体名称</div>
                <div className="mt-1">{font.name}</div>
              </div>

              <div>
                <div className="text-muted-foreground text-sm font-medium">字体族</div>
                <div className="mt-1">
                  <code className="bg-muted rounded px-2 py-1 text-sm">{font.fontFamily}</code>
                </div>
              </div>

              {font.englishName && (
                <div>
                  <div className="text-muted-foreground text-sm font-medium">英文名称</div>
                  <div className="mt-1">{font.englishName}</div>
                </div>
              )}

              {font.chineseName && (
                <div>
                  <div className="text-muted-foreground text-sm font-medium">中文名称</div>
                  <div className="mt-1">{font.chineseName}</div>
                </div>
              )}

              <div>
                <div className="text-muted-foreground text-sm font-medium">标准化名称</div>
                <div className="mt-1">
                  <code className="bg-muted rounded px-2 py-1 text-sm">{font.normalizedName}</code>
                </div>
              </div>

              <div>
                <div className="text-muted-foreground text-sm font-medium">版本号</div>
                <div className="mt-1">{font.version}</div>
              </div>

              {font.designer && (
                <div>
                  <div className="text-muted-foreground text-sm font-medium">设计师</div>
                  <div className="mt-1">{font.designer}</div>
                </div>
              )}

              {font.foundry && (
                <div>
                  <div className="text-muted-foreground text-sm font-medium">字体厂商</div>
                  <div className="mt-1">{font.foundry}</div>
                </div>
              )}
            </div>

            {font.description && (
              <>
                <Separator />
                <div>
                  <div className="text-muted-foreground text-sm font-medium">描述</div>
                  <div className="mt-1 text-sm">{font.description}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 分类和品牌 */}
        <Card>
          <CardHeader>
            <CardTitle>分类和品牌</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-muted-foreground text-sm font-medium">字体分类</div>
                <div className="mt-1">
                  {font.category ? (
                    <Badge variant="secondary">{font.category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">未分类</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground text-sm font-medium">品牌商</div>
                <div className="mt-1">
                  {font.brand ? (
                    <Badge variant="outline">{font.brand.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">无品牌</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 授权信息 */}
        {(font.license || font.licenseType) && (
          <Card>
            <CardHeader>
              <CardTitle>授权信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {font.licenseType && (
                  <div>
                    <div className="text-muted-foreground text-sm font-medium">授权类型</div>
                    <div className="mt-1">
                      <Badge>
                        {font.licenseType === 'free_commercial' && '免费商用'}
                        {font.licenseType === 'free_personal' && '个人免费'}
                        {font.licenseType === 'trial' && '试用版'}
                        {font.licenseType === 'paid' && '付费'}
                        {font.licenseType === 'contact' && '联系授权'}
                      </Badge>
                    </div>
                  </div>
                )}

                {font.license && (
                  <div>
                    <div className="text-muted-foreground text-sm font-medium">授权协议</div>
                    <div className="mt-1 text-sm">{font.license}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 标签 */}
        {((font.tags && font.tags.length > 0) || (font.fontTags && font.fontTags.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle>标签</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {font.tags && font.tags.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-2 text-sm font-medium">通用标签</div>
                  <div className="flex flex-wrap gap-2">
                    {font.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {font.fontTags && font.fontTags.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-2 text-sm font-medium">风格</div>
                  <div className="flex flex-wrap gap-2">
                    {font.fontTags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 时间信息 */}
        <Card>
          <CardHeader>
            <CardTitle>时间信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-muted-foreground text-sm font-medium">创建时间</div>
                <div className="mt-1 text-sm">
                  {new Date(font.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground text-sm font-medium">更新时间</div>
                <div className="mt-1 text-sm">
                  {new Date(font.updatedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
