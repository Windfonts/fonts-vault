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
import { Github, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { HeaderPicksLink } from './header-picks-link';

export function Header() {
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/fonts', label: '字体列表' },
    { href: '/docs', label: '文档' },
  ];

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/icon.webp" alt="Logo" width={32} height={32} className="h-8 w-8 rounded" />
            <span
              className="text-xl font-bold sm:text-xl"
              style={{ fontFamily: 'windfonts-prsxt' }}
            >
              文风字库
            </span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {navItems.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href={item.href}>{item.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <HeaderPicksLink />
          {/* GitHub Link */}
          <Button variant="outline" size="icon" asChild className="hidden sm:flex">
            <a
              href="https://github.com/Windfonts/font-packages.git"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="字体源码仓库"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Image
                    src="/icon.webp"
                    alt="Logo"
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded"
                  />
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
                <div className="border-t pt-4">
                  <a
                    href="https://github.com/Windfonts/font-packages.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="hover:text-primary flex items-center gap-2 text-lg font-medium transition-colors"
                  >
                    <Github className="h-5 w-5" />
                    字体源码
                  </a>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
