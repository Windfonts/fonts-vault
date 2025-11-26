'use client';

import { FontCard } from '@/components/font/font-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFontCSS } from '@/hooks/use-font-css';
import { Brand, Category, Font } from '@/lib/db/schema';
import { Check, Code, Copy, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FontDetailContentProps {
  font: Omit<Font, 'brand' | 'category'> & {
    brand?: Brand | null;
    category?: Category | null;
  };
  relatedFonts: Array<
    Omit<Font, 'brand' | 'category'> & {
      brand?: Brand | null;
      category?: Category | null;
    }
  >;
  analysis?: Record<string, unknown>;
}

export function FontDetailContent({ font, relatedFonts, analysis }: FontDetailContentProps) {
  // Get available weights from font data
  const availableWeights = font.weights
    ? Object.values(font.weights).map((w) => ({
        name: w.weight_name,
        value: w.font_weight,
      }))
    : [];

  const firstWeightName = font.weights ? Object.keys(font.weights)[0] : 'Regular';

  const [copied, setCopied] = useState(false);
  const [previewText, setPreviewText] = useState('字体预览 Font Preview 1234567890');
  const [fontSize, setFontSize] = useState(48);
  const [selectedWeight, setSelectedWeight] = useState(firstWeightName);
  const [charSearchQuery, setCharSearchQuery] = useState('');
  const [charSearchResult, setCharSearchResult] = useState<{
    foundChars: Array<{ char: string; codepoint: string }>;
    notFoundChars: string[];
    totalSearched: number;
  } | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [localAnalysis, setLocalAnalysis] = useState(analysis);

  // 加载字体 CSS（详情页使用 full 版本）
  useFontCSS({
    family: font.fontFamily,
    weight: firstWeightName,
    version: 'full',
  });

  // Generate CSS API URL - 使用当前系统的 origin
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const cssApiUrl = `${baseUrl}/api/css?family=${encodeURIComponent(font.fontFamily)}&weight=${firstWeightName}&version=full`;

  // Copy CSS URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(cssApiUrl);
      setCopied(true);
      toast.success('CSS 链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败，请手动复制');
    }
  };

  // 加载字体分析数据
  const loadAnalysisData = async () => {
    setIsLoadingAnalysis(true);
    try {
      const response = await fetch(`/api/fonts/${font.id}/analysis`);
      const result = await response.json();

      if (result.code === 200) {
        setLocalAnalysis(result.data);
        toast.success('字体分析数据加载成功');
      } else {
        toast.error(result.message || '加载失败');
      }
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // 查询字符是否存在（支持多个字符）
  const handleCharSearch = () => {
    if (!charSearchQuery.trim()) {
      toast.error('请输入要查询的字符');
      return;
    }

    const currentAnalysis = localAnalysis || analysis;

    if (!currentAnalysis) {
      toast.error('字体分析数据未加载，请先加载数据');
      return;
    }

    // 获取所有要查询的字符
    const searchChars = Array.from(charSearchQuery.trim());

    // 从 analysis 数据中获取字符数组
    let charArray: string[] = [];

    if (currentAnalysis?.characters || currentAnalysis?.chars) {
      const characters = (currentAnalysis?.characters || currentAnalysis?.chars) as any;

      if (typeof characters === 'string') {
        charArray = Array.from(characters);
      } else if (Array.isArray(characters)) {
        charArray = characters.map((ch) =>
          typeof ch === 'string' ? ch : String.fromCodePoint(ch)
        );
      }
    }

    // 分类字符：存在的和不存在的
    const foundChars: Array<{ char: string; codepoint: string }> = [];
    const notFoundChars: string[] = [];

    searchChars.forEach((char) => {
      if (charArray.includes(char)) {
        const codepoint = 'U+' + char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0');
        foundChars.push({ char, codepoint });
      } else {
        notFoundChars.push(char);
      }
    });

    setCharSearchResult({
      foundChars,
      notFoundChars,
      totalSearched: searchChars.length,
    });

    // Toast 提示
    if (notFoundChars.length === 0) {
      toast.success(`所有 ${searchChars.length} 个字符都存在于该字体中`);
    } else if (foundChars.length === 0) {
      toast.error(`所有 ${searchChars.length} 个字符都不存在于该字体中`);
    } else {
      toast.info(`找到 ${foundChars.length} 个字符，${notFoundChars.length} 个字符不存在`);
    }
  };

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground mb-6 text-sm">
        <a href="/" className="hover:text-foreground">
          首页
        </a>
        {' / '}
        <a href="/fonts" className="hover:text-foreground">
          字体列表
        </a>
        {' / '}
        <span className="text-foreground">{font.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight">{font.name}</h1>
            {font.englishName && (
              <p className="text-muted-foreground text-xl">{font.englishName}</p>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
          {font.category && (
            <div className="flex items-center gap-2">
              <span className="font-medium">分类:</span>
              <span className="font-bold">{font.category.name}</span>
            </div>
          )}
          {font.fontTags && font.fontTags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">风格:</span>
              <div className="flex flex-wrap gap-1">
                {font.fontTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {font.licenseType && (
            <Badge variant="outline" className="text-sm">
              {font.licenseType}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main Content */}
        <div className="min-w-0 space-y-8">
          {/* Preview Section */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>字体预览</CardTitle>
              <CardDescription>实时预览不同字号和样式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 overflow-x-hidden">
              {/* Editable Preview Text */}
              <div>
                <label className="mb-2 block text-sm font-medium">预览文本</label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="输入自定义预览文本"
                />
              </div>

              {/* Font Size Slider */}
              <div className="max-w-full">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">字体大小</label>
                  <span className="text-muted-foreground text-sm">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="120"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="accent-primary h-2 w-full max-w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                />
                <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                  <span>12px</span>
                  <span>120px</span>
                </div>
              </div>

              {/* Weight Selector */}
              {availableWeights.length > 1 && (
                <div>
                  <label className="mb-2 block text-sm font-medium">字重</label>
                  <div className="flex flex-wrap gap-2">
                    {availableWeights.map((weight) => (
                      <button
                        key={weight.value}
                        onClick={() => setSelectedWeight(weight.name)}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          selectedWeight === weight.name
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-accent'
                        }`}
                      >
                        {weight.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Preview */}
              <div className="bg-muted flex min-h-[200px] items-center justify-center overflow-x-auto rounded-md p-6">
                <div
                  style={{
                    fontFamily: font.fontFamily,
                    fontSize: `${fontSize}px`,
                    fontWeight:
                      availableWeights.find((w) => w.name === selectedWeight)?.value || 400,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                  className="text-center"
                >
                  {previewText}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CSS API Usage */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                CSS API 使用
              </CardTitle>
              <CardDescription>在您的项目中使用此字体</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 overflow-x-hidden">
              {/* API Parameters */}
              <div>
                <label className="mb-3 block text-sm font-medium">API 参数说明</label>
                <div className="space-y-3 text-sm">
                  <div className="bg-muted rounded-md p-3">
                    <div className="mb-1 font-medium">family（必需）</div>
                    <div className="text-muted-foreground">
                      字体族名称，如：
                      <code className="bg-background rounded px-1.5 py-0.5">{font.fontFamily}</code>
                    </div>
                  </div>
                  <div className="bg-muted rounded-md p-3">
                    <div className="mb-1 font-medium">weight（可选，默认 Regular）</div>
                    <div className="text-muted-foreground">
                      字重名称，可选值：{availableWeights.map((w) => w.name).join('、')}
                    </div>
                  </div>
                  <div className="bg-muted rounded-md p-3">
                    <div className="mb-1 font-medium">version（可选，默认 full）</div>
                    <div className="text-muted-foreground space-y-1">
                      <div>字符集版本，可选值：</div>
                      <ul className="ml-2 list-inside list-disc space-y-0.5">
                        <li>
                          <code className="bg-background rounded px-1.5 py-0.5">full</code> -
                          完整字符集（推荐）
                        </li>
                        <li>
                          <code className="bg-background rounded px-1.5 py-0.5">zh-common</code> -
                          常用中文字符（轻量）
                        </li>
                        <li>
                          <code className="bg-background rounded px-1.5 py-0.5">zh</code> -
                          中文字符集
                        </li>
                        <li>
                          <code className="bg-background rounded px-1.5 py-0.5">en</code> -
                          英文字符集
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* CSS Link */}
              <div>
                <label className="mb-2 block text-sm font-medium">CSS 链接（完整版本）</label>
                <div className="flex min-w-0 gap-2">
                  <input
                    type="text"
                    value={cssApiUrl}
                    readOnly
                    className="bg-muted min-w-0 flex-1 truncate rounded-md border px-3 py-2 font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* HTML Usage Example */}
              <div>
                <label className="mb-2 block text-sm font-medium">HTML 使用示例</label>
                <pre className="bg-muted max-w-full overflow-x-auto rounded-md p-4 text-sm">
                  <code className="text-xs">{`<!-- 使用完整字符集 -->
<link rel="stylesheet" href="${cssApiUrl}" />

<!-- 使用轻量中文字符集 -->
<link rel="stylesheet" href="${baseUrl}/api/css?family=${encodeURIComponent(font.fontFamily)}&weight=Regular&version=zh-common" />

<style>
  body {
    font-family: '${font.fontFamily}', sans-serif;
  }
</style>`}</code>
                </pre>
              </div>

              {/* CSS Usage Example */}
              <div>
                <label className="mb-2 block text-sm font-medium">CSS 使用示例</label>
                <pre className="bg-muted max-w-full overflow-x-auto rounded-md p-4 text-sm">
                  <code className="text-xs">{`/* 使用完整字符集 */
@import url('${cssApiUrl}');

/* 使用轻量中文字符集 */
@import url('${baseUrl}/api/css?family=${encodeURIComponent(font.fontFamily)}&weight=Regular&version=zh-common');

.my-text {
  font-family: '${font.fontFamily}', sans-serif;
}`}</code>
                </pre>
              </div>

              {/* Version Recommendation */}
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                <div className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                  💡 版本选择建议
                </div>
                <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>
                    <strong>full</strong>：适合需要完整字符支持的场景
                  </li>
                  <li>
                    <strong>zh-common</strong>：适合中文网站，文件更小，加载更快
                  </li>
                  <li>
                    <strong>zh</strong>：适合纯中文内容
                  </li>
                  <li>
                    <strong>en</strong>：适合英文内容或标题
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <Card>
            <CardHeader>
              <CardTitle>详细信息</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">基本信息</TabsTrigger>
                  <TabsTrigger value="license">授权信息</TabsTrigger>
                  <TabsTrigger value="technical">技术信息</TabsTrigger>
                  <TabsTrigger value="coverage">字符信息</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4 space-y-4">
                  {font.description && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">描述</h4>
                      <p className="text-muted-foreground text-sm">{font.description}</p>
                    </div>
                  )}
                  {font.designer && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">设计师</h4>
                      <p className="text-muted-foreground text-sm">{font.designer}</p>
                    </div>
                  )}
                  {font.releaseYear && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">发布年份</h4>
                      <p className="text-muted-foreground text-sm">{font.releaseYear}</p>
                    </div>
                  )}
                  {font.fontCategory && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">字体类型</h4>
                      <p className="text-muted-foreground text-sm">{font.fontCategory}</p>
                    </div>
                  )}
                  {font.style && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">风格</h4>
                      <p className="text-muted-foreground text-sm">{font.style}</p>
                    </div>
                  )}
                  {font.languages && font.languages.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">支持语言</h4>
                      <div className="flex flex-wrap gap-2">
                        {font.languages.map((lang) => (
                          <Badge key={lang} variant="outline">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="license" className="mt-4 space-y-4">
                  {font.license && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">授权协议</h4>
                      <p className="text-muted-foreground text-sm">{font.license}</p>
                    </div>
                  )}
                  {font.licenseType && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">授权类型</h4>
                      <Badge variant="secondary">{font.licenseType}</Badge>
                    </div>
                  )}
                  {font.licenseDescription && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">授权说明</h4>
                      <p className="text-muted-foreground text-sm">{font.licenseDescription}</p>
                    </div>
                  )}
                  {font.price && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">价格</h4>
                      <p className="text-muted-foreground text-sm">¥{font.price}</p>
                    </div>
                  )}
                  {font.purchaseUrl && (
                    <div>
                      <Button asChild>
                        <a href={font.purchaseUrl} target="_blank" rel="noopener noreferrer">
                          购买授权
                        </a>
                      </Button>
                    </div>
                  )}
                  {font.copyright && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">版权信息</h4>
                      <p className="text-muted-foreground text-sm">{font.copyright}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="technical" className="mt-4 space-y-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium">字体族名称</h4>
                    <code className="bg-muted rounded px-2 py-1 text-sm">{font.fontFamily}</code>
                  </div>
                  {font.version && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">版本号</h4>
                      <code className="bg-muted rounded px-2 py-1 text-sm">{font.version}</code>
                    </div>
                  )}
                  {availableWeights.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">可用字重</h4>
                      <div className="flex flex-wrap gap-2">
                        {availableWeights.map((weight) => (
                          <Badge key={weight.value} variant="outline">
                            {weight.name} ({weight.value})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="coverage" className="mt-4 space-y-4">
                  {/* 字符查询功能 */}
                  <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Search className="h-5 w-5" />
                        字符查询
                      </CardTitle>
                      <CardDescription>
                        输入字符，查询该字体是否包含此字符
                        {!localAnalysis && !analysis && (
                          <span className="ml-2 text-orange-600 dark:text-orange-400">
                            • 需要先加载字体分析数据
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!localAnalysis && !analysis ? (
                        <div className="py-4 text-center">
                          <p className="text-muted-foreground mb-4 text-sm">
                            字体分析数据未加载，请点击下方按钮加载
                          </p>
                          <Button onClick={loadAnalysisData} disabled={isLoadingAnalysis}>
                            {isLoadingAnalysis ? '加载中...' : '加载字体分析数据'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="输入要查询的字符，支持多个，例如：中文字体"
                            value={charSearchQuery}
                            onChange={(e) => setCharSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCharSearch();
                              }
                            }}
                            className="flex-1"
                            maxLength={50}
                          />
                          <Button onClick={handleCharSearch}>
                            <Search className="mr-2 h-4 w-4" />
                            查询
                          </Button>
                        </div>
                      )}

                      {charSearchResult && (
                        <div className="space-y-4">
                          {/* 统计信息 */}
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">查询字符数:</span>
                              <span className="font-medium">{charSearchResult.totalSearched}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 dark:text-green-400">✓ 存在:</span>
                              <span className="font-medium">
                                {charSearchResult.foundChars.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 dark:text-red-400">✗ 不存在:</span>
                              <span className="font-medium">
                                {charSearchResult.notFoundChars.length}
                              </span>
                            </div>
                          </div>

                          {/* 存在的字符 */}
                          {charSearchResult.foundChars.length > 0 && (
                            <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                              <div className="mb-3 font-medium text-green-900 dark:text-green-100">
                                ✓ 存在的字符 ({charSearchResult.foundChars.length})
                              </div>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                {charSearchResult.foundChars.map(({ char, codepoint }, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 rounded-md border border-green-200 bg-white p-3 dark:border-green-700 dark:bg-green-900"
                                  >
                                    <div
                                      className="text-3xl text-green-700 dark:text-green-300"
                                      style={{ fontFamily: font.fontFamily }}
                                    >
                                      {char}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-mono text-xs text-green-800 dark:text-green-200">
                                        {codepoint}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 不存在的字符 */}
                          {charSearchResult.notFoundChars.length > 0 && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                              <div className="mb-3 font-medium text-red-900 dark:text-red-100">
                                ✗ 不存在的字符 ({charSearchResult.notFoundChars.length})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {charSearchResult.notFoundChars.map((char, idx) => (
                                  <div
                                    key={idx}
                                    className="flex h-12 w-12 items-center justify-center rounded-md border border-red-200 bg-white text-2xl text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-300"
                                  >
                                    {char}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 text-xs text-red-800 dark:text-red-200">
                                这些字符可能无法使用该字体正常显示
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <div className="text-muted-foreground text-sm">字符总数</div>
                      <div className="mt-1 text-2xl font-bold">
                        {
                          ((localAnalysis || analysis)?.total_char_count ??
                            (localAnalysis || analysis)?.char_count ??
                            (localAnalysis || analysis)?.chars?.length ??
                            (localAnalysis || analysis)?.characters?.length ??
                            '-') as any
                        }
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-muted-foreground text-sm">字形总数</div>
                      <div className="mt-1 text-2xl font-bold">
                        {
                          ((localAnalysis || analysis)?.total_glyph_count ??
                            (localAnalysis || analysis)?.glyph_count ??
                            '-') as any
                        }
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-muted-foreground text-sm">版本统计</div>
                      <div className="mt-2 text-sm">
                        {Object.values(font.weights || {})
                          .slice(0, 1)
                          .map((w) => (
                            <div key={w.weight_name} className="space-y-1">
                              {Object.entries(w.versions || {}).map(([vName, v]) => (
                                <div key={vName} className="flex items-center justify-between">
                                  <span>{vName}</span>
                                  <span className="text-muted-foreground">
                                    chars {v.char_count} • glyphs {v.glyph_count}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Tags */}
          {font.tags && font.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">标签</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {font.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Use Cases */}
          {font.useCases && font.useCases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">适用场景</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {font.useCases.map((useCase) => (
                    <Badge key={useCase} variant="outline">
                      {useCase}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">统计信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">浏览次数</span>
                <span className="font-medium">{font.viewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">下载次数</span>
                <span className="font-medium">{font.downloadCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API 调用</span>
                <span className="font-medium">{font.apiCallCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Brand Info */}
          {font.brand && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">厂商信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {font.brand.logoUrl && (
                  <div className="bg-muted flex justify-center rounded-md p-4">
                    <img
                      src={font.brand.logoUrl}
                      alt={font.brand.name}
                      className="max-h-16 object-contain"
                    />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium">{font.brand.name}</h4>
                  {font.brand.description && (
                    <p className="text-muted-foreground mt-1 text-sm">{font.brand.description}</p>
                  )}
                </div>
                {font.brand.website && (
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={font.brand.website} target="_blank" rel="noopener noreferrer">
                      访问官网
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* Related Fonts */}
      {relatedFonts.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold">相关字体推荐</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedFonts.slice(0, 6).map((relatedFont) => (
              <FontCard key={relatedFont.id} font={relatedFont} variant="grid" showPreview={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
