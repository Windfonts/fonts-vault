import { FontCard } from '@/components/font/font-card';
import { HomeSearchSection } from '@/components/home/home-search-section';
import { PublicLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { categoryService } from '@/lib/services/category.service';
import { fontService } from '@/lib/services/font.service';
import { ArrowRight, Palette, Search, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

// ISR: 每小时重新生成首页
export const revalidate = 3600;

export default async function Home() {
  // 获取推荐字体（热门字体，带关联数据）
  const recommendedFonts = await fontService.getPopularFontsWithRelations(6);

  // 获取所有分类用于导航
  const categories = await categoryService.findAll();

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 md:py-16">
        {/* Hero Section - 平台介绍区域 */}
        <section className="mb-16 text-center">
          <div className="mx-auto max-w-4xl">
            <h1
              className="mb-4 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
              style={{ fontFamily: 'WF-Hclcks, sans-serif' }}
            >
              文风字库
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg md:text-xl">
              专业的在线字体 CDN 平台，海量字体资源，一行代码即可集成
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/fonts">
                  浏览字体
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">查看文档</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Quick Search Section - 快速搜索入口 */}
        <HomeSearchSection />

        {/* Features Section - 主要功能 */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold">主要功能</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm transition-all hover:shadow-md">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Palette className="text-primary h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">字体浏览</h3>
              <p className="text-muted-foreground text-sm">
                浏览和预览所有可用的字体，支持按分类、品牌筛选
              </p>
            </div>
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm transition-all hover:shadow-md">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Zap className="text-primary h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">实时预览</h3>
              <p className="text-muted-foreground text-sm">
                使用自定义文本实时预览字体效果，支持多种字号和样式
              </p>
            </div>
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm transition-all hover:shadow-md">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Search className="text-primary h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">智能搜索</h3>
              <p className="text-muted-foreground text-sm">
                快速搜索字体名称、品牌或标签，精准找到所需字体
              </p>
            </div>
            <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm transition-all hover:shadow-md">
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Shield className="text-primary h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">API 接口</h3>
              <p className="text-muted-foreground text-sm">
                提供 Google Fonts 风格的 CSS API，方便在应用中使用字体
              </p>
            </div>
          </div>
        </section>

        {/* Category Navigation - 分类导航 */}
        {categories.length > 0 && (
          <section className="mb-16">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-3xl font-bold">字体分类</h2>
              <Button variant="ghost" asChild>
                <Link href="/fonts">
                  查看全部
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={`/fonts?category=${category.id}`}
                  className="group bg-card text-card-foreground rounded-lg border p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="group-hover:text-primary font-semibold">{category.name}</h3>
                    <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                  {category.description && (
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                      {category.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recommended Fonts Section - 推荐字体展示 */}
        {recommendedFonts.length > 0 && (
          <section className="mb-16">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">热门字体</h2>
                <p className="text-muted-foreground mt-2">探索最受欢迎的字体，为您的项目增添魅力</p>
              </div>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link href="/fonts">
                  查看更多
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedFonts.map((font) => (
                <FontCard
                  key={font.id}
                  font={font}
                  variant="grid"
                  showPreview={true}
                  previewText="字体预览 Font Preview"
                />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Button variant="ghost" asChild>
                <Link href="/fonts">
                  查看更多
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* CTA Section - 行动号召 */}
        <section className="from-primary/10 via-primary/5 to-background rounded-lg bg-gradient-to-r p-8 text-center md:p-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">开始探索字体世界</h2>
            <p className="text-muted-foreground mb-6">
              立即浏览我们的字体库，找到最适合您项目的字体。支持实时预览、智能搜索和便捷的 API
              接入。
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/fonts">
                  立即开始
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">了解更多</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
