'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export function HomeSearchSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/fonts?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="mb-16">
      <div className="mx-auto max-w-3xl">
        <div className="bg-card rounded-lg border p-6 shadow-sm md:p-8">
          <h2 className="mb-4 text-center text-2xl font-bold">快速搜索</h2>
          <p className="text-muted-foreground mb-6 text-center text-sm">
            搜索字体名称、品牌或标签，快速找到您需要的字体
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="例如：思源黑体、Arial、手写体..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" size="default">
              搜索
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-muted-foreground text-sm">热门搜索：</span>
            {['思源黑体', '宋体', '手写体', '无衬线'].map((tag) => (
              <Button
                key={tag}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery(tag);
                  router.push(`/fonts?search=${encodeURIComponent(tag)}`);
                }}
                className="h-7 text-xs"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
