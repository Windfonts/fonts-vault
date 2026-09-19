'use client';

import { picksCount } from '@/lib/font-picks';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/** PublicLayout 顶栏「选字」角标 → /fonts/picks */
export function HeaderPicksLink() {
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
      className="hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors"
      title="我的选字"
    >
      选字
      <span
        className="bg-foreground text-background inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] tabular-nums"
        data-count={n}
      >
        {n}
      </span>
    </Link>
  );
}
