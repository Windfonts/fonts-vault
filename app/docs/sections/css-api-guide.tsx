'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CssApiGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CSS API 概述</CardTitle>
          <CardDescription>通过 CSS API 在您的网站中安全地加载和使用字体</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            CSS API 提供了一个安全的方式来加载字体文件，无需直接访问 OSS 存储。
            所有字体文件都通过代理服务器提供，确保资源安全。
          </p>
          <div>
            <h3 className="mb-2 font-semibold">API 端点</h3>
            <code className="bg-muted block rounded-md p-3">GET /api/css?family=字体名称</code>
          </div>
        </CardContent>
      </Card>

      {/* Basic Usage */}
      <Card>
        <CardHeader>
          <CardTitle>基础用法</CardTitle>
          <CardDescription>在 HTML 中引入字体</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">1. 在 HTML 头部引入字体</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard('<link rel="stylesheet" href="/api/css?family=思源黑体">', 0)
                }
              >
                {copiedIndex === 0 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`<link rel="stylesheet" href="/api/css?family=思源黑体">`}
            </pre>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">2. 在 CSS 中使用字体</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard('body {\n  font-family: "思源黑体", sans-serif;\n}', 1)
                }
              >
                {copiedIndex === 1 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`body {
  font-family: "思源黑体", sans-serif;
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Usage */}
      <Card>
        <CardHeader>
          <CardTitle>高级用法</CardTitle>
          <CardDescription>使用多个字体和字重</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">加载多个字体</h4>
            <p className="text-muted-foreground mb-2 text-sm">使用 | 符号分隔多个字体名称</p>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">示例</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    '<link rel="stylesheet" href="/api/css?family=思源黑体|思源宋体">',
                    2
                  )
                }
              >
                {copiedIndex === 2 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`<link rel="stylesheet" href="/api/css?family=思源黑体|思源宋体">`}
            </pre>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">指定字重</h4>
            <p className="text-muted-foreground mb-2 text-sm">在字体名称后使用 : 指定字重</p>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">示例</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    '<link rel="stylesheet" href="/api/css?family=思源黑体:400,700">',
                    3
                  )
                }
              >
                {copiedIndex === 3 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`<link rel="stylesheet" href="/api/css?family=思源黑体:400,700">`}
            </pre>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">语言子集</h4>
            <p className="text-muted-foreground mb-2 text-sm">使用 subset 参数指定字符子集</p>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`<link rel="stylesheet" href="/api/css?family=思源黑体&subset=chinese-simplified">`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>性能优化</CardTitle>
          <CardDescription>提高字体加载性能的建议</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>使用 font-display</strong>
                <p className="text-muted-foreground">
                  CSS API 默认使用 font-display: swap，确保文本在字体加载期间可见
                </p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>只加载需要的字重</strong>
                <p className="text-muted-foreground">
                  避免加载所有字重，只选择实际使用的字重以减少加载时间
                </p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>利用浏览器缓存</strong>
                <p className="text-muted-foreground">
                  CSS API 响应包含缓存头，浏览器会自动缓存字体文件
                </p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>使用 preconnect</strong>
                <p className="text-muted-foreground">
                  在 HTML 头部添加 preconnect 提示以加快连接速度
                </p>
                <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-2 text-xs">
                  {`<link rel="preconnect" href="https://your-domain.com">`}
                </pre>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Complete Example */}
      <Card>
        <CardHeader>
          <CardTitle>完整示例</CardTitle>
          <CardDescription>一个完整的 HTML 页面示例</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">HTML 示例</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>字体示例</title>
  <link rel="preconnect" href="https://your-domain.com">
  <link rel="stylesheet" href="/api/css?family=思源黑体:400,700">
  <style>
    body {
      font-family: "思源黑体", sans-serif;
      font-weight: 400;
    }
    h1 {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <h1>欢迎使用文风字库</h1>
  <p>这是使用思源黑体的示例文本。</p>
</body>
</html>`,
                  4
                )
              }
            >
              {copiedIndex === 4 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <pre className="bg-muted overflow-x-auto rounded-md p-4 text-xs">
            {`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>字体示例</title>
  <link rel="preconnect" href="https://your-domain.com">
  <link rel="stylesheet" href="/api/css?family=思源黑体:400,700">
  <style>
    body {
      font-family: "思源黑体", sans-serif;
      font-weight: 400;
    }
    h1 {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <h1>欢迎使用文风字库</h1>
  <p>这是使用思源黑体的示例文本。</p>
</body>
</html>`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
