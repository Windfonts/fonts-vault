import { FontCard } from '@/components/font/font-card';
import { PublicLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { categoryService } from '@/lib/services/category.service';
import { fontService } from '@/lib/services/font.service';
import { HomeHeroSearch } from '@/components/home/home-hero-search';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const recommendedFonts = await fontService.getPopularFontsWithRelations(6);
  const categories = await categoryService.findAll();

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
        {/* P0-6 slim hero: brand + search + category chips */}
        <section className="mb-12 space-y-6 text-center">
          <div>
            <p className="text-muted-foreground mb-2 text-sm tracking-wide">文风字库 · 在线字体 CDN</p>
            <h1
              className="text-3xl font-bold tracking-tight md:text-5xl"
              style={{ fontFamily: 'windfonts-prsxt, sans-serif' }}
            >
              文风字库
            </h1>
          </div>
          <HomeHeroSearch />
          {categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2" role="navigation" aria-label="分类">
              {categories.slice(0, 10).map((category) => (
                <Link
                  key={category.id}
                  href={`/fonts?category=${category.id}`}
                  className="hover:bg-muted inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors"
                >
                  {category.name}
                </Link>
              ))}
              <Link
                href="/fonts"
                className="hover:bg-muted inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors"
              >
                全部
              </Link>
            </div>
          )}
        </section>

        {/* Featured specimen rows */}
        {recommendedFonts.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">精选字帖</h2>
                <p className="text-muted-foreground text-sm">真字预览 · 点进列表可改共用样句</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/fonts">
                  全部字体
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {recommendedFonts.map((font) => (
                <FontCard
                  key={font.id}
                  font={font}
                  variant="list"
                  showPreview={true}
                  previewText="春风又绿江南岸，明月何时照我还。"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
