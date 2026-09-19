import { ReactNode } from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { cn } from '@/lib/utils';

interface PublicLayoutProps {
  children: ReactNode;
  /** next 首页：全屏暗底，不套 max-width */
  variant?: 'default' | 'home';
}

export function PublicLayout({ children, variant = 'default' }: PublicLayoutProps) {
  const isHome = variant === 'home';
  return (
    <div className={cn('dark flex min-h-screen flex-col bg-background text-foreground', isHome && 'relative')}>
      <Header variant={isHome ? 'home' : 'default'} />
      <main className={cn('relative z-10 flex-1', !isHome && 'bg-background')}>
        {isHome ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        )}
      </main>
      {!isHome && <Footer />}
    </div>
  );
}
