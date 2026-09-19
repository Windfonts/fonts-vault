import Link from 'next/link';
import { Fragment } from 'react';
import { cn } from '@/lib/utils';

export type VerticalTag = { label: string; href: string };

/** next 竖排分类：home=白字暗底；list=深字浅底 */
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
        isHome ? 'mt-8 h-[7.25rem]' : 'h-[9rem] w-full bg-muted/40 py-6'
      )}
    >
      {tags.map((item, index) => (
        <Fragment key={item.href + item.label}>
          {index !== 0 && (
            <span className={cn('h-full w-px', isHome ? 'bg-white/40' : 'bg-foreground/15')} />
          )}
          <Link
            href={item.href}
            className={cn(
              'relative flex h-full cursor-pointer flex-col items-center justify-between transition-colors',
              isHome
                ? 'w-16 text-white/40 hover:text-white sm:w-20'
                : 'w-[4.5rem] text-foreground/55 hover:text-foreground sm:w-[5.5rem]'
            )}
          >
            {item.label.split('').map((ch, i) => (
              <span className="relative z-10 leading-none" key={`${ch}-${i}`}>
                {ch}
              </span>
            ))}
          </Link>
        </Fragment>
      ))}
    </div>
  );
}
