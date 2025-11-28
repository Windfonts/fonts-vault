'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CssApiGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 获取当前域名
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

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
                  {`<link rel="preconnect" href="${baseUrl}">`}
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
  <link rel="preconnect" href="${baseUrl}">
  <link rel="stylesheet" href="${baseUrl}/api/css?family=思源黑体:400,700">
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
  <link rel="preconnect" href="${baseUrl}">
  <link rel="stylesheet" href="${baseUrl}/api/css?family=思源黑体:400,700">
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

      {/* NPM Package Usage */}
      <Card>
        <CardHeader>
          <CardTitle>NPM 包使用方式</CardTitle>
          <CardDescription>通过 NPM 包在 React、Vue 等现代前端项目中使用字体</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">1. 安装依赖</h4>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">使用 npm 安装</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('npm install @windfonts/chinese-fonts', 5)}
              >
                {copiedIndex === 5 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`npm install @windfonts/chinese-fonts`}
            </pre>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">2. 在项目中加载字体</h4>
            <p className="text-muted-foreground mb-2 text-sm">
              使用 loadFont 函数加载字体，支持字符子集选择
            </p>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">基础用法</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `import { loadFont } from '@windfonts/chinese-fonts';

// 加载完整字符集
loadFont('Siyuan-Heiti-Regular');

// 加载常用中文字符（推荐，文件更小）
loadFont('Siyuan-Heiti-Regular', { subset: 'zh-common' });

// 加载中文字符集
loadFont('Siyuan-Heiti-Regular', { subset: 'zh' });

// 加载英文字符集
loadFont('Siyuan-Heiti-Regular', { subset: 'en' });`,
                    6
                  )
                }
              >
                {copiedIndex === 6 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`import { loadFont } from '@windfonts/chinese-fonts';

// 加载完整字符集
loadFont('Siyuan-Heiti-Regular');

// 加载常用中文字符（推荐，文件更小）
loadFont('Siyuan-Heiti-Regular', { subset: 'zh-common' });

// 加载中文字符集
loadFont('Siyuan-Heiti-Regular', { subset: 'zh' });

// 加载英文字符集
loadFont('Siyuan-Heiti-Regular', { subset: 'en' });`}
            </pre>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">3. 在组件中使用</h4>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Next.js App Router 示例</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `// app/layout.tsx
import { loadFont } from '@windfonts/chinese-fonts';

// 在组件外部加载字体
loadFont('Siyuan-Heiti-Regular', { subset: 'zh-common' });

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ fontFamily: 'Siyuan-Heiti, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}`,
                    7
                  )
                }
              >
                {copiedIndex === 7 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`// app/layout.tsx
import { loadFont } from '@windfonts/chinese-fonts';

// 在组件外部加载字体
loadFont('Siyuan-Heiti-Regular', { subset: 'zh-common' });

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ fontFamily: 'Siyuan-Heiti, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}`}
            </pre>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">React 组件示例</h4>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">在组件中使用</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `import { loadFont } from '@windfonts/chinese-fonts';

// 在组件外部加载
loadFont('Siyuan-Heiti-Regular', { subset: 'zh-common' });

function MyComponent() {
  return (
    <div style={{ fontFamily: 'Siyuan-Heiti, sans-serif' }}>
      <h1>欢迎使用文风字库</h1>
      <p>这是使用 NPM 包加载的字体</p>
    </div>
  );
}`,
                    8
                  )
                }
              >
                {copiedIndex === 8 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
              {`import { loadFont } from '@windfonts/chinese-fonts';

// 在组件外部加载
loadFont('Siyuan-Heiti-Regular', { subset: 'zh-common' });

function MyComponent() {
  return (
    <div style={{ fontFamily: 'Siyuan-Heiti, sans-serif' }}>
      <h1>欢迎使用文风字库</h1>
      <p>这是使用 NPM 包加载的字体</p>
    </div>
  );
}`}
            </pre>
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <div className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
              💡 字体名称规则
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>
                <strong>格式</strong>：<code>[标准化名称]-[字重]</code>，如{' '}
                <code>Siyuan-Heiti-Regular</code>
              </li>
              <li>
                <strong>标准化名称</strong>：使用 PascalCase 格式，如 <code>Siyuan-Heiti</code>
                （思源黑体）
              </li>
              <li>
                <strong>字重名称</strong>：首字母大写，如 <code>Regular</code>、<code>Bold</code>、
                <code>Light</code>
              </li>
              <li>
                <strong>字符子集</strong>：
                <ul className="list-circle mt-1 ml-4 list-inside">
                  <li>
                    <code>zh-common</code>：常用中文（推荐，文件小）
                  </li>
                  <li>
                    <code>zh</code>：完整中文字符集
                  </li>
                  <li>
                    <code>en</code>：英文字符集
                  </li>
                  <li>不指定：完整字符集</li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">常用字体加载示例</h4>
            <div className="bg-muted space-y-2 rounded-md p-4 text-xs">
              <div>
                <strong>思源黑体 Regular：</strong>
                <code className="ml-2">
                  loadFont('Siyuan-Heiti-Regular', {"{ subset: 'zh-common' }"})
                </code>
              </div>
              <div>
                <strong>思源黑体 Bold：</strong>
                <code className="ml-2">
                  loadFont('Siyuan-Heiti-Bold', {"{ subset: 'zh-common' }"})
                </code>
              </div>
              <div>
                <strong>思源宋体 Regular：</strong>
                <code className="ml-2">
                  loadFont('Siyuan-Songti-Regular', {"{ subset: 'zh-common' }"})
                </code>
              </div>
              <div>
                <strong>霞鹜文楷 Regular：</strong>
                <code className="ml-2">
                  loadFont('Lxgw-Wenkai-Regular', {"{ subset: 'zh-common' }"})
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
