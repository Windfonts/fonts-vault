'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FontSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  initialValue?: string;
  className?: string;
}

export function FontSearch({
  onSearch,
  placeholder = '搜索字体名称、品牌或标签...',
  debounceMs = 300,
  initialValue = '',
  className,
}: FontSearchProps) {
  const [query, setQuery] = useState(initialValue || '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue || '');
  const lastEmitted = useRef<string | undefined>(initialValue || '');

  // URL / 外链改 search 时同步输入框，勿把外链刚写入的 search 用空串冲掉
  useEffect(() => {
    const v = initialValue || '';
    setQuery(v);
    setDebouncedQuery(v);
    lastEmitted.current = v;
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  useEffect(() => {
    if (debouncedQuery === lastEmitted.current) return;
    lastEmitted.current = debouncedQuery;
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pr-9 pl-9"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">清除搜索</span>
        </Button>
      )}
    </div>
  );
}
