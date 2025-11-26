'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the FontPreview component
export const FontPreviewLazy = dynamic(
  () => import('./font-preview').then((mod) => ({ default: mod.FontPreview })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[100px] w-full" />
      </div>
    ),
    ssr: false,
  }
);
