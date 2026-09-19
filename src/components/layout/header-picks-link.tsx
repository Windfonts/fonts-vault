'use client';

import { picksCount } from '@/lib/font-picks';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function HeaderPicksLink({ tone = 'default' }: { tone?: 'default' | 'light' }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const sync = () => setN(picksCount());
    sync();
    window.addEventListener('windfonts-picks-changed', sync);
    return () => window.removeEventListener('windfonts-picks-changed', sync);
  }, []);

  return (
    <Link
      href="/fonts/picks"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-medium transition-colors',
        tone === 'light'
          ? 'border-border/70 text-foreground hover:bg-accent dark:border-white/40 dark:text-white dark:hover:bg-white/10'
          : 'hover:bg-muted border-border'
      )}
      title="我的选字"
    >
      选字
      <span
        className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] tabular-nums',
          tone === 'light'
            ? 'bg-foreground text-background dark:bg-white dark:text-black'
            : 'bg-foreground text-background'
        )}
        data-count={n}
      >
        {n}
      </span>
    </Link>
  );
}
