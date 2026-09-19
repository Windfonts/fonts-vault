'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FontSearchProps {
  onSearch: (query: string) => void;
  /** 点清除时走这条，避免空串 onSearch 与 URL 外链竞态 */
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  initialValue?: string;
  className?: string;
}

/**
 * 列表顶搜索。外链/点作者写入 ?search= 时，切勿因 onSearch 引用变化
 * 用旧的空 debouncedQuery 再回调一次把 URL 冲掉。
 */
export function FontSearch({
  onSearch,
  onClear,
  placeholder = '搜索字体名称、品牌或标签...',
  debounceMs = 300,
  initialValue = '',
  className,
}: FontSearchProps) {
  const [query, setQuery] = useState(initialValue || '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue || '');
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const skipEmitOnce = useRef(false);

  useEffect(() => {
    const v = initialValue || '';
    skipEmitOnce.current = true;
    setQuery(v);
    setDebouncedQuery(v);
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  useEffect(() => {
    if (skipEmitOnce.current) {
      skipEmitOnce.current = false;
      return;
    }
    onSearchRef.current(debouncedQuery);
  }, [debouncedQuery]);

  const handleClear = useCallback(() => {
    setQuery('');
    skipEmitOnce.current = true;
    setDebouncedQuery('');
    if (onClear) onClear();
    else onSearchRef.current('');
  }, [onClear]);

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
