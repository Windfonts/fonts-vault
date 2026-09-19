import { PublicLayout } from '@/components/layout';
import { categoryService } from '@/lib/services/category.service';
import { HomeHeroSearch } from '@/components/home/home-hero-search';
import { VerticalTagNav } from '@/components/home/vertical-tag-nav';
import { resolveNextHomeTags } from '@/lib/next-home-tags';
import { EXTRA_LINKS, SAFE_CODE } from '@/constant/constant';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

/** next 气质暗底首页：背景图 + logo-bar + 搜索 + 竖排分类；页脚贴视口底 */
export default async function Home() {
  const categories = await categoryService.findAll();
  const tags = resolveNextHomeTags(categories);

  return (
    <PublicLayout variant="home">
      <div className="relative flex min-h-[calc(100dvh-4.25rem)] flex-col">
        <Image
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          src="/images/home.webp"
          width={1920}
          height={1485}
          alt=""
          priority
        />
        <div className="absolute inset-0 z-0 bg-black/72" />
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

        <article className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
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
            <VerticalTagNav tags={tags} tone="home" />
          </div>
        </article>

        <footer className="relative z-10 mt-auto border-t border-white/10 bg-black/85 px-4 py-3 text-center text-xs text-white/45 backdrop-blur-md">
          <div className="mb-1.5 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {EXTRA_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.path.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/80"
              >
                {link.label.replace(/\s*头像$/, '')}
              </a>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-white/35 sm:text-xs">{SAFE_CODE}</p>
        </footer>
      </div>
    </PublicLayout>
  );
}
