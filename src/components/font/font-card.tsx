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

  return (
    <Link href={`/fonts/${font.normalizedName}`}>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-lg',
          isGrid ? 'h-full' : 'flex flex-row'
        )}
      >
        <CardHeader className={cn(isGrid ? '' : 'flex-1')}>
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

        <CardContent className={cn(isGrid ? '' : 'flex-1')}>
          {showPreview && (
            <div
              className="bg-muted mb-4 overflow-hidden rounded-md p-4 text-center"
              style={{
                fontFamily: font.fontFamily,
                fontSize: isGrid ? '1.5rem' : '1.25rem',
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
