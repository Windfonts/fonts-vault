'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

function ColorSchemeMeta() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const scheme = resolvedTheme === 'light' ? 'light' : 'dark';
    let meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'color-scheme';
      document.head.appendChild(meta);
    }
    meta.content = scheme;
    document.documentElement.style.colorScheme = scheme === 'light' ? 'only light' : 'only dark';
  }, [resolvedTheme]);
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="wf-theme"
      disableTransitionOnChange={false}
    >
      <ColorSchemeMeta />
      {children}
    </NextThemesProvider>
  );
}
