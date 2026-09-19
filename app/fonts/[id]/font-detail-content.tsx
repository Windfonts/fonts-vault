'use client';

import { FontCard } from '@/components/font/font-card';
import { Badge } from '@/components/ui/badge';
import { evaluateLicense, licenseWhatYouCanDo } from '@/lib/license-gate';
import { isPicked, togglePick } from '@/lib/font-picks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useFontCSS } from '@/hooks/use-font-css';
import { Brand, Category, Font } from '@/lib/db/schema';
import { Check, Code, Copy, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    setPicked(isPicked(font.id));
    const sync = () => setPicked(isPicked(font.id));
    window.addEventListener('windfonts-picks-changed', sync);
    return () => window.removeEventListener('windfonts-picks-changed', sync);
  }, [font.id]);
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
  const [copiedNpm, setCopiedNpm] = useState(false);

  // 加载字体 CSS（详情页使用 full 版本）
  useFontCSS({
    family: font.fontFamily,
    weight: firstWeightName,
    version: 'full',
  });

  // Generate CSS API URL - 使用当前系统的 origin
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const cssApiUrl = `${baseUrl}/api/css?family=${encodeURIComponent((font.normalizedName || font.fontFamily).toLowerCase())}&weight=${firstWeightName.toLowerCase()}&version=full`;

  // Copy CSS URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(cssApiUrl);
      setCopied(true);
      toast.success('CSS 链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  // Copy NPM code to clipboard
  const handleCopyNpm = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNpm(true);
      toast.success('代码已复制到剪贴板');
      setTimeout(() => setCopiedNpm(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  // 生成标准化的字体名称（PascalCase）
  const getNormalizedFontName = () => {
    return font.normalizedName
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('-');
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
      const characters = currentAnalysis?.characters ?? currentAnalysis?.chars;

      if (typeof characters === 'string') {
        charArray = Array.from(characters);
      } else if (Array.isArray(characters)) {
        charArray = characters.map((ch) => {
          if (typeof ch === 'string') return ch;
          if (typeof ch === 'number') return String.fromCodePoint(ch);
          return String(ch);
        });
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

  const htmlUsage = `<!-- 使用完整字符集 -->
<link rel="stylesheet" href="${cssApiUrl}" />

<!-- 使用轻量中文字符集 -->
<link rel="stylesheet" href="${baseUrl}/api/css?family=${encodeURIComponent((font.normalizedName || font.fontFamily).toLowerCase())}&weight=regular&version=zh-common" />

<style>
  body {
    font-family: '${font.fontFamily}', sans-serif;
  }
</style>`;

  const cssUsage = `/* 使用完整字符集 */
@import url('${cssApiUrl}');

/* 使用轻量中文字符集 */
@import url('${baseUrl}/api/css?family=${encodeURIComponent((font.normalizedName || font.fontFamily).toLowerCase())}&weight=regular&version=zh-common');

.my-text {
  font-family: '${font.fontFamily.toLowerCase()}', sans-serif;
}`;

  const npmInstallCode = `npm install @windfonts/chinese-fonts`;

  const npmImportCode = `import { loadFont } from '@windfonts/chinese-fonts';

// 加载当前选择的字重（推荐使用 zh-common 子集）
loadFont('${getNormalizedFontName()}-${selectedWeight}', { subset: 'zh-common' });

// 在组件中使用
const MyComponent = () => (
  <div style={{ fontFamily: '${font.fontFamily}' }}>
    你的文本内容
  </div>
);`;

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground mb-6 text-sm">
        <Link href="/" className="hover:text-foreground">
          首页
        </Link>
        {' / '}
        <Link href="/fonts" className="hover:text-foreground">
          字体列表
        </Link>
        {' / '}
        <span className="text-foreground">{font.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight">{font.name}</h1>
            <Button
              type="button"
              size="sm"
              variant={picked ? "default" : "outline"}
              className="mt-2"
              onClick={() => {
                const on = togglePick({
                  id: font.id,
                  normalizedName: font.normalizedName,
                  name: font.name,
                  fontFamily: font.fontFamily,
                  englishName: font.englishName,
                });
                setPicked(on);
                toast.success(on ? "已加入选字" : "已移出选字");
              }}
            >
              {picked ? "已在选字" : "加入选字"}
            </Button>
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

          {(() => {
            const gate = evaluateLicense({ normalizedName: font.normalizedName, license: font.license, licenseType: font.licenseType });
            return (
              <Badge variant="outline" className="text-sm">
                {gate.displayLabel}
              </Badge>
            );
          })()}
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
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${selectedWeight === weight.name
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
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="flex flex-col">
                    {/* Parameter: family */}
                    <div className="grid grid-cols-[100px_1fr] gap-4 p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">family</span>
                        <span className="text-[10px] text-red-500 font-medium">必需</span>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        {font.fontFamily.toLowerCase()}
                      </div>
                    </div>

                    {/* Parameter: weight */}
                    <div className="grid grid-cols-[100px_1fr] gap-4 p-4 bg-muted/30">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">weight</span>
                        <span className="text-[10px] text-muted-foreground">可选</span>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {availableWeights.map((w) => (
                          <span key={w.name} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-gray-500/10">
                            {w.name.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Parameter: version */}
                    <div className="grid grid-cols-[100px_1fr] gap-4 p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">version</span>
                        <span className="text-[10px] text-muted-foreground">可选</span>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-foreground min-w-[80px]">full</span>
                          <span className="text-muted-foreground text-xs leading-5">完整字符集（推荐）</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-foreground min-w-[80px]">zh-common</span>
                          <span className="text-muted-foreground text-xs leading-5">常用中文字符（轻量）</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-foreground min-w-[80px]">zh</span>
                          <span className="text-muted-foreground text-xs leading-5">中文字符集</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-foreground min-w-[80px]">en</span>
                          <span className="text-muted-foreground text-xs leading-5">英文字符集</span>
                        </div>
                      </div>
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
                <div className="relative group">
                  <pre className="bg-muted text-foreground max-w-full overflow-x-auto rounded-md p-4 text-sm pr-12">
                    <code className="text-xs font-mono">{htmlUsage}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopyNpm(htmlUsage)}
                  >
                    {copiedNpm ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* CSS Usage Example */}
              <div>
                <label className="mb-2 block text-sm font-medium">CSS 使用示例</label>
                <div className="relative group">
                  <pre className="bg-muted text-foreground max-w-full overflow-x-auto rounded-md p-4 text-sm pr-12">
                    <code className="text-xs font-mono">{cssUsage}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopyNpm(cssUsage)}
                  >
                    {copiedNpm ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* NPM Package Usage */}
              <div>
                <label className="mb-2 block text-sm font-medium">NPM 包使用方式</label>
                <div className="space-y-3">
                  {/* Installation */}
                  <div>
                    <div className="text-muted-foreground mb-2 text-xs">1. 安装依赖</div>
                    <div className="relative group">
                      <pre className="bg-muted text-foreground max-w-full overflow-x-auto rounded-md p-4 text-sm pr-12 ">
                        <code className="text-xs font-mono">{npmInstallCode}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyNpm(npmInstallCode)}
                      >
                        {copiedNpm ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Import Usage */}
                  <div>
                    <div className="text-muted-foreground mb-2 text-xs">
                      2. 使用 loadFont 函数加载字体（当前选择：{selectedWeight}）
                    </div>
                    <div className="relative group">
                      <pre className="bg-muted text-foreground max-w-full overflow-x-auto rounded-md p-4 text-sm pr-12 ">
                        <code className="text-xs font-mono">{npmImportCode}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyNpm(npmImportCode)}
                      >
                        {copiedNpm ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
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
          {/* Character Coverage */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">字符覆盖</h3>

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
                        <span className="text-muted-foreground">✓ 存在:</span>
                        <span className="font-medium">
                          {charSearchResult.foundChars.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-destructive">✗ 不存在:</span>
                        <span className="font-medium">
                          {charSearchResult.notFoundChars.length}
                        </span>
                      </div>
                    </div>

                    {/* 存在的字符 */}
                    {charSearchResult.foundChars.length > 0 && (
                      <div className="rounded-md border border-border/50 bg-muted/30 p-4">
                        <div className="mb-3 font-medium text-foreground">
                          ✓ 存在的字符 ({charSearchResult.foundChars.length})
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {charSearchResult.foundChars.map(({ char, codepoint }, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
                            >
                              <div
                                className="text-3xl text-foreground"
                                style={{ fontFamily: font.fontFamily }}
                              >
                                {char}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-mono text-xs text-muted-foreground">
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
                      ((localAnalysis || analysis)?.chars as string[] | undefined)?.length ??
                      ((localAnalysis || analysis)?.characters as string[] | undefined)
                        ?.length ??
                      '-') as string | number
                  }
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-sm">字形总数</div>
                <div className="mt-1 text-2xl font-bold">
                  {
                    ((localAnalysis || analysis)?.total_glyph_count ??
                      (localAnalysis || analysis)?.glyph_count ??
                      '-') as string | number
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
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Brand Info & License */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">品牌与授权</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Brand Section */}
              {font.brand ? (
                <div className="space-y-3">
                  {font.brand.logoUrl && (
                    <div className="bg-muted flex justify-center rounded-md p-4">
                      <Image
                        src={font.brand.logoUrl}
                        alt={font.brand.name}
                        width={128}
                        height={64}
                        className="max-h-16 object-contain"
                        unoptimized
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
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">暂无品牌信息</div>
              )}

              <Separator />

              {/* Version & License Section */}
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                  <span className="text-muted-foreground">当前版本</span>
                  <span className="font-medium text-foreground text-right">{font.version}</span>
                </div>

                <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                  <span className="text-muted-foreground">授权类型</span>
                  <div className="flex justify-end">
                    {(() => {
                      const gate = evaluateLicense({
                        normalizedName: font.normalizedName,
                        license: font.license,
                        licenseType: font.licenseType,
                      })
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="h-5">{gate.displayLabel}</Badge>
                          {gate.licenseSpdx && (
                            <span className="text-[10px] text-muted-foreground">SPDX: {gate.licenseSpdx}</span>
                          )}
                          {!gate.licenseVerified && (
                            <span className="text-[10px] text-amber-600">许可尚未人工核实</span>
                          )}
                          <p className="text-muted-foreground max-w-md text-[11px] leading-snug">
                            {licenseWhatYouCanDo(gate.licenseLabel)}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {(font.copyright || font.license) && (
                  <div className="space-y-3 pt-2">
                    {font.copyright && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">版权声明</div>
                        <div className="text-xs text-foreground bg-muted/50 p-2.5 rounded-md border border-border/50 break-words leading-relaxed">
                          {font.copyright}
                        </div>
                      </div>
                    )}
                    {font.license && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">授权协议</div>
                        <div className="text-xs text-foreground bg-muted/50 p-2.5 rounded-md border border-border/50 break-words line-clamp-4 leading-relaxed">
                          {font.license}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Font Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">字体属性</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                <div className="text-muted-foreground">字重数量</div>
                <div className="text-right font-medium">{Object.keys(font.weights || {}).length}</div>

                {font.category && (
                  <>
                    <div className="text-muted-foreground">分类</div>
                    <div className="text-right font-medium">{font.category.name}</div>
                  </>
                )}

                {font.style && (
                  <>
                    <div className="text-muted-foreground">风格</div>
                    <div className="text-right font-medium">{font.style}</div>
                  </>
                )}

                <div className="col-span-2 my-1">
                  <Separator />
                </div>

                <div className="text-muted-foreground">文件格式</div>
                <div className="text-right font-medium">WOFF2</div>

                <div className="text-muted-foreground">字符编码</div>
                <div className="text-right font-medium">Unicode</div>
              </div>
            </CardContent>
          </Card>

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
