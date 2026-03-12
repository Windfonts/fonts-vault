'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFontCSS } from '@/hooks/use-font-css';
import { Brand, Category, Font } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface FontCardProps {
  font: Omit<Font, 'brand' | 'category'> & {
    brand?: Brand | null;
    category?: Category | null;
  };
  variant?: 'grid' | 'list';
  showPreview?: boolean;
  previewText?: string;
}

export function FontCard({
  font,
  variant = 'grid',
  showPreview = true,
  previewText = `文风字体  windfonts`,
}: FontCardProps) {
  const isGrid = variant === 'grid';

  // 获取第一个可用字重
  const firstWeight = font.weights ? Object.keys(font.weights)[0] : 'Regular';

  // 计算字重数量
  const weightsCount = font.weights ? Object.keys(font.weights).length : 0;

  // 加载字体 CSS（卡片使用 zh-common 版本）
  useFontCSS({
    family: font.fontFamily,
    weight: firstWeight,
    version: 'zh-common',
    enabled: showPreview,
  });

  const normalizedRoute = font.normalizedName.toLowerCase();

  if (!isGrid) {
    return (
      <Link href={`/fonts/${normalizedRoute}`} className="block w-full">
        <div className="group hover:bg-muted/50 flex w-full items-center gap-4 rounded-lg border p-4 transition-colors">
          {/* 左侧：字体预览 */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-white text-2xl text-black dark:bg-black dark:text-white"
            style={{ fontFamily: font.fontFamily }}
          >
            文风
          </div>

          {/* 中间：字体信息 */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">{font.name}</h3>
              {font.licenseType && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                  {font.licenseType}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {font.englishName || font.fontFamily}
            </p>
          </div>

          {/* 右侧：统计信息与标签 */}
          <div className="hidden shrink-0 items-center gap-6 sm:flex">
            {/* 字重数量 */}
            {weightsCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span>{weightsCount} 字重</span>
              </div>
            )}

            {/* 浏览量 */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>{font.viewCount || 0}</span>
            </div>

            {/* 下载量 */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>{font.downloadCount || 0}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/fonts/${normalizedRoute}`}>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-lg',
          'h-full'
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-lg">{font.name}</CardTitle>
            {font.licenseType && (
              <Badge variant="secondary" className="shrink-0">
                {font.licenseType}
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-1">
            {font.englishName || font.fontFamily}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {showPreview && (
            <div
              className="bg-muted mb-4 h-24 overflow-hidden rounded-md p-4 text-center"
              style={{
                fontFamily: font.fontFamily,
                fontSize: '1.5rem',
              }}
            >
              <p className="line-clamp-2">{previewText}</p>
            </div>
          )}

          <div className="text-muted-foreground space-y-3 text-sm">
            {font.category && (
              <div className="flex items-center gap-2">
                <span className="font-medium">分类:</span>
                <span>{font.category.name}</span>
              </div>
            )}
            {font.fontTags && font.fontTags.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {font.fontTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-xs">
            <div className="flex items-center gap-3">
              {weightsCount > 0 && (
                <div className="flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{weightsCount} 字重</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span>{font.viewCount || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>{font.downloadCount || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
