import { PublicLayout } from '@/components/layout';
import { categoryService } from '@/lib/services/category.service';
import { HomeHeroSearch } from '@/components/home/home-hero-search';
import { VerticalTagNav } from '@/components/home/vertical-tag-nav';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/** next 气质暗底首页：背景图 + logo-bar + 搜索 + 竖排分类 */
export default async function Home() {
  const categories = await categoryService.findAll();
  const tags = categories.slice(0, 9).map((c) => ({
    label: c.name,
    href: `/fonts?category=${c.id}`,
  }));

  // 不足时补 next 默认气质类目（走 search）
  const fallback = ['黑体', '宋体', '楷体', '隶书', '拼音', '硬笔手写', '毛笔书法', '卡通创意', '其他'];
  while (tags.length < 9) {
    const name = fallback[tags.length];
    tags.push({ label: name, href: `/fonts?search=${encodeURIComponent(name)}` });
  }

  return (
    <PublicLayout variant="home">
      <div className="relative flex min-h-[calc(100vh-4.25rem)] flex-col">
        <Image
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          src="/images/home.webp"
          width={1920}
          height={1485}
          alt=""
          priority
        />
        <div className="absolute inset-0 z-0 bg-black/65" />

        <article className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
          <div className="flex w-full max-w-[45rem] flex-col items-center">
            <div className="relative mb-10 h-12 w-56 sm:h-[3.25rem] sm:w-[15.375rem]">
              <Image
                className="object-contain"
                src="/images/logo-bar.webp"
                fill
                alt="文风字体"
                priority
              />
            </div>
            <div className="w-full px-2 sm:px-10">
              <HomeHeroSearch variant="home" />
            </div>
            <VerticalTagNav tags={tags} />
          </div>
        </article>

        <footer className="relative z-10 bg-black/80 py-4 text-center text-xs text-white/40">
          <div className="mb-2 flex flex-wrap justify-center gap-4 text-white/45">
            <Link href="/fonts" className="hover:text-white">字体列表</Link>
            <Link href="/docs" className="hover:text-white">文档</Link>
            <Link href="/fonts/picks" className="hover:text-white">我的选字</Link>
          </div>
          <p>文风字库 · 参照 next 前台气质</p>
        </footer>
      </div>
    </PublicLayout>
  );
}
