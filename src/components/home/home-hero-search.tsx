'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function HomeHeroSearch({ variant = 'default' }: { variant?: 'default' | 'home' }) {
  const [q, setQ] = useState('');
  const router = useRouter();
  const isHome = variant === 'home';

  function go(e?: FormEvent) {
    e?.preventDefault();
    const t = q.trim();
    if (!t) {
      router.push('/fonts');
      return;
    }
    router.push(`/fonts?search=${encodeURIComponent(t)}`);
  }

  return (
    <form
      onSubmit={go}
      className={cn('mx-auto flex w-full gap-2', isHome ? 'max-w-xl' : 'max-w-xl')}
      role="search"
    >
      <div className="relative flex-1">
        <Search
          className={cn(
            'absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2',
            isHome ? 'text-muted-foreground dark:text-white/60' : 'text-muted-foreground'
          )}
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isHome ? '搜索海量免费字体' : '搜索字体，例如：思源、霞鹜、手写…'}
          className={cn(
            'pl-9',
            isHome &&
              'h-12 rounded-full border-border bg-background/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring dark:border-white/50 dark:bg-transparent dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/40'
          )}
          aria-label="搜索字体"
        />
      </div>
      {!isHome && <Button type="submit">搜索</Button>}
    </form>
  );
}
