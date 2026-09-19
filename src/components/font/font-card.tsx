'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFontCSS } from '@/hooks/use-font-css';
import { useFontSample, DEFAULT_SAMPLE } from '@/hooks/use-font-sample';
import { evaluateLicense } from '@/lib/license-gate';
import { isPicked, togglePick } from '@/lib/font-picks';
import { Brand, Category, Font } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';

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
  previewText,
}: FontCardProps) {
  const isGrid = variant === 'grid';
  const { sampleText, sampleSize } = useFontSample();
  const text = previewText || sampleText || DEFAULT_SAMPLE;
  const firstWeight = font.weights ? Object.keys(font.weights)[0] : 'Regular';
  const weightsCount = font.weights ? Object.keys(font.weights).length : 0;
  const cssFamily = (font.normalizedName || font.fontFamily || '').toLowerCase();

  useFontCSS({
    family: cssFamily,
    weight: firstWeight,
    version: 'zh-common',
    enabled: showPreview,
  });

  const gate = evaluateLicense({
    normalizedName: font.normalizedName,
    license: font.license,
    licenseType: font.licenseType,
  });

  const [picked, setPicked] = useState(false);
  useEffect(() => {
    setPicked(isPicked(font.id));
    const sync = () => setPicked(isPicked(font.id));
    window.addEventListener('windfonts-picks-changed', sync);
    return () => window.removeEventListener('windfonts-picks-changed', sync);
  }, [font.id]);

  const normalizedRoute = font.normalizedName.toLowerCase();

  const onTogglePick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const on = togglePick({
      id: font.id,
      normalizedName: font.normalizedName,
      name: font.name,
      fontFamily: font.fontFamily,
      englishName: font.englishName,
    });
    setPicked(on);
  };

  if (!isGrid) {
    return (
      <div className="group hover:bg-muted/40 w-full rounded-lg border p-4 transition-colors">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/fonts/${normalizedRoute}`} className="truncate text-lg font-semibold hover:underline">
                {font.name}
              </Link>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                {gate.displayLabel}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {font.brand?.name ? `作者/品牌：${font.brand.name}` : font.englishName || font.fontFamily}
              {weightsCount > 0 ? ` · ${weightsCount} 字重` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" variant={picked ? 'default' : 'outline'} onClick={onTogglePick}>
              {picked ? '已在选字' : '加入选字'}
            </Button>
            <Button type="button" size="sm" variant="ghost" asChild>
              <Link href={`/fonts/${normalizedRoute}`}>详情</Link>
            </Button>
          </div>
        </div>
        {showPreview && (
          <Link href={`/fonts/${normalizedRoute}`} className="block">
            <div
              className="min-h-[3.5rem] break-words leading-tight text-foreground"
              style={{
                fontFamily: font.fontFamily,
                fontSize: `${sampleSize}px`,
              }}
            >
              {text}
            </div>
          </Link>
        )}
      </div>
    );
  }

  return (
    <Link href={`/fonts/${normalizedRoute}`} className="block h-full">
      <Card className="group hover:border-primary/50 flex h-full flex-col overflow-hidden transition-all hover:shadow-md">
        {showPreview && (
          <div
            className="flex min-h-[120px] items-center justify-center border-b bg-white px-4 py-6 text-black dark:bg-zinc-950 dark:text-white"
            style={{ fontFamily: font.fontFamily, fontSize: '28px', lineHeight: 1.3 }}
          >
            <span className="line-clamp-3 break-words text-center">{text}</span>
          </div>
        )}
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-base">{font.name}</CardTitle>
            <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
              {gate.displayLabel}
            </Badge>
          </div>
          <CardDescription className="line-clamp-1">
            {font.englishName || font.fontFamily}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex items-center justify-between pt-0 text-xs text-muted-foreground">
          <span>{weightsCount > 0 ? `${weightsCount} 字重` : '—'}</span>
          <span>{font.viewCount || 0} 浏览</span>
        </CardContent>
      </Card>
    </Link>
  );
}
