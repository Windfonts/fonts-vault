import Link from 'next/link';
import { Fragment } from 'react';
import { cn } from '@/lib/utils';

export type VerticalTag = { label: string; href: string };

function isMostlyLatin(label: string) {
  const letters = label.replace(/\s/g, '');
  if (!letters) return false;
  const latin = letters.match(/[A-Za-z0-9]/g)?.length ?? 0;
  return latin / letters.length >= 0.6;
}

/** next 竖排分类：home=白字+毛玻璃底；list=深字浅底。拉丁短词不竖拆。 */
export function VerticalTagNav({
  tags,
  tone = 'home',
}: {
  tags: VerticalTag[];
  tone?: 'home' | 'list';
}) {
  const isHome = tone === 'home';
  return (
    <div
      className={cn(
        'tags-nav flex items-center justify-center',
        isHome
          ? 'mt-8 h-[7.25rem] rounded-xl bg-background/75 px-2 shadow-[inset_0_0_0_1px_var(--border)] backdrop-blur-md sm:px-3 dark:bg-black/55 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
          : 'h-[9rem] w-full bg-muted/40 py-6'
      )}
    >
      {tags.map((item, index) => {
        const latin = isMostlyLatin(item.label);
        return (
          <Fragment key={item.href + item.label}>
            {index !== 0 && (
              <span className={cn('h-full w-px shrink-0', isHome ? 'bg-border dark:bg-white/35' : 'bg-foreground/15')} />
            )}
            <Link
              href={item.href}
              className={cn(
                'relative flex h-full cursor-pointer items-center justify-center transition-colors',
                isHome
                  ? 'w-14 text-foreground/80 hover:text-foreground sm:w-16 dark:text-white/85 dark:hover:text-white'
                  : 'w-[4.5rem] text-foreground/55 hover:text-foreground sm:w-[5.5rem]',
                latin
                  ? 'flex-col justify-center px-0.5 text-center text-[11px] leading-tight tracking-wide'
                  : 'flex-col justify-between'
              )}
            >
              {latin ? (
                <span className="relative z-10 [writing-mode:vertical-rl]">{item.label}</span>
              ) : (
                item.label.split('').map((ch, i) => (
                  <span className="relative z-10 leading-none" key={`${ch}-${i}`}>
                    {ch}
                  </span>
                ))
              )}
            </Link>
          </Fragment>
        );
      })}
    </div>
  );
}
