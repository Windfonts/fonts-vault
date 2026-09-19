'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function HomeHeroSearch() {
  const [q, setQ] = useState('');
  const router = useRouter();

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
    <form onSubmit={go} className="mx-auto flex max-w-xl gap-2" role="search">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索字体，例如：思源、霞鹜、手写…"
          className="pl-9"
          aria-label="搜索字体"
        />
      </div>
      <Button type="submit">搜索</Button>
    </form>
  );
}
