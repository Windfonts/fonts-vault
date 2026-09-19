'use client';

import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Github, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { HeaderPicksLink } from './header-picks-link';

export function Header({ variant = 'default' }: { variant?: 'default' | 'home' }) {
  const [open, setOpen] = useState(false);
  const isHome = variant === 'home';

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/fonts', label: '字体库' },
    { href: '/docs', label: '文档' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b backdrop-blur',
        isHome
          ? 'border-border/40 bg-background/55 text-foreground dark:border-white/10 dark:bg-white/10 dark:text-white'
          : 'bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border'
      )}
    >
      <div className="mx-auto flex h-[4.25rem] w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/icon.webp" alt="Logo" width={40} height={40} className="h-10 w-10 rounded-lg" />
            <span className="text-lg font-bold" style={{ fontFamily: 'windfonts-prsxt' }}>
              文风字体
            </span>
          </Link>

          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {navItems.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),
                      isHome &&
                        'bg-transparent hover:bg-accent dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-white'
                    )}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle tone={isHome ? 'home' : 'default'} />
          <HeaderPicksLink tone={isHome ? 'light' : 'default'} />
          <Button
            variant="outline"
            size="icon"
            asChild
            className={cn(
              'hidden sm:flex',
              isHome && 'border-border/50 dark:border-white/30 dark:bg-transparent dark:text-white dark:hover:bg-white/10'
            )}
          >
            <a
              href="https://github.com/Windfonts/font-packages.git"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="字体源码仓库"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className={cn(isHome && 'dark:text-white dark:hover:bg-white/10')}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Image src="/icon.webp" alt="Logo" width={24} height={24} className="h-6 w-6 rounded" />
                  导航菜单
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="hover:text-primary text-lg font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/fonts/picks"
                  onClick={() => setOpen(false)}
                  className="hover:text-primary text-lg font-medium transition-colors"
                >
                  我的选字
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
