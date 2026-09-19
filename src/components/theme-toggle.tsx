'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Icon = action to take (not current weather):
 * dark → Sun (切换到浅色); light → Moon (切换到深色)
 */
export function ThemeToggle({
  className,
  tone = 'default',
}: {
  className?: string;
  tone?: 'default' | 'home';
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Prefer resolvedTheme only after mount to avoid hydration invert.
  const isDark = mounted ? resolvedTheme === 'dark' : true;

  if (!mounted) {
    // Neutral placeholder: same glyph as default dark → Sun (matches defaultTheme)
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('h-9 w-9 transition-colors duration-150', className)}
        aria-label="切换到浅色模式"
        disabled
      >
        <Sun className="h-4 w-4 opacity-40" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        'h-9 w-9 transition-colors duration-150',
        tone === 'home' &&
          'border-border/50 bg-background/40 dark:border-white/30 dark:bg-transparent dark:text-white dark:hover:bg-white/10',
        className
      )}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      title={isDark ? '浅色' : '深色'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
