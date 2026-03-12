'use client';

/**
 * Global error boundary for handling runtime errors
 * This catches errors in Server Components and Client Components
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error);
    }
  }, [error]);

  return (
    <div className="from-background to-muted flex min-h-screen flex-col items-center justify-center bg-gradient-to-b px-4">
      <div className="mx-auto max-w-md text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="bg-destructive/10 rounded-full p-6">
            <AlertCircle className="text-destructive h-16 w-16" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-destructive mb-4 text-6xl font-bold">500</h1>

        {/* Title */}
        <h2 className="mb-4 text-2xl font-semibold">出错了</h2>

        {/* Description */}
        <p className="text-muted-foreground mb-2">
          抱歉，应用程序遇到了一个错误。
          <br />
          我们已经记录了这个问题，将尽快修复。
        </p>

        {/* Error details in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-muted mt-4 mb-8 rounded-lg p-4 text-left">
            <p className="text-destructive mb-2 text-sm font-semibold">开发模式错误信息：</p>
            <p className="text-muted-foreground text-xs">{error.message}</p>
            {error.digest && (
              <p className="text-muted-foreground mt-2 text-xs">错误ID: {error.digest}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
        </div>

        {/* Help text */}
        <div className="mt-12 border-t pt-8">
          <p className="text-muted-foreground text-sm">
            如果问题持续存在，请联系技术支持或稍后再试。
          </p>
        </div>
      </div>
    </div>
  );
}
