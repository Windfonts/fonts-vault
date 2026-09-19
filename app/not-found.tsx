'use client';

/**
 * Custom 404 Not Found page
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="from-background to-muted flex min-h-screen flex-col items-center justify-center bg-gradient-to-b px-4">
      <div className="mx-auto max-w-md text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="bg-primary/10 rounded-full p-6">
            <FileQuestion className="text-primary h-16 w-16" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-primary mb-4 text-6xl font-bold">404</h1>

        {/* Title */}
        <h2 className="mb-4 text-2xl font-semibold">页面未找到</h2>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          抱歉，您访问的页面不存在或已被移除。
          <br />
          请检查URL是否正确，或返回首页继续浏览。
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" onClick={() => window.history.back()}>
            <button type="button">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回上一页
            </button>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 border-t pt-8">
          <p className="text-muted-foreground mb-4 text-sm">您可能想访问：</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/fonts" className="text-primary hover:underline">
              字体库
            </Link>
            <Link href="/docs" className="text-primary hover:underline">
              使用文档
            </Link>
            <Link href="/admin" className="text-primary hover:underline">
              管理后台
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
