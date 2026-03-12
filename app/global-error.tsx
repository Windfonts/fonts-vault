'use client';

/**
 * Global error boundary for catching errors in the root layout
 * This is a fallback for errors that occur before the regular error boundary
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error boundary caught:', error);
    }
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-background text-foreground min-h-screen">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 font-sans">
          <div className="w-full max-w-xl text-center">
            <div className="mb-8 text-5xl">⚠️</div>
            <h1 className="mb-4 text-4xl font-bold text-red-600">500</h1>
            <h2 className="mb-4 text-xl font-semibold">应用程序错误</h2>
            <p className="text-muted-foreground mb-8">
              抱歉，应用程序遇到了一个严重错误。
              <br />
              请刷新页面重试。
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="bg-muted mb-8 rounded-lg p-4 text-left">
                <p className="mb-2 text-sm font-semibold text-red-600">开发模式错误信息：</p>
                <p className="text-muted-foreground text-xs">{error.message}</p>
                {error.digest && (
                  <p className="text-muted-foreground mt-2 text-xs">错误ID: {error.digest}</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-blue-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-600"
              >
                🔄 重试
              </button>
              <Link
                href="/"
                className="border-primary text-primary hover:bg-primary/10 rounded-lg border px-6 py-3 text-base font-medium transition-colors"
              >
                🏠 返回首页
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
