'use client';

import { UserNav } from '@/components/auth/user-nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { FileText, Home, Layers, Menu, RefreshCw, ShieldCheck, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function AdminHeader() {
  const [open, setOpen] = useState(false);

  const adminNavItems = [
    { href: '/admin', label: '仪表板', icon: Home },
    { href: '/admin/fonts', label: '字体管理', icon: FileText },
    { href: '/admin/brands', label: '厂商管理', icon: Tag },
    { href: '/admin/categories', label: '分类管理', icon: Layers },
    { href: '/admin/sync', label: '同步管理', icon: RefreshCw },
    { href: '/admin/security-switches', label: '安全中心', icon: ShieldCheck },
  ];

  return (
    <header className="bg-background sticky top-0 z-50 w-full border-b">
      <div className="max-w-8xl mx-auto flex h-16 w-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center space-x-2">
            <Image src="/icon.webp" alt="Logo" width={32} height={32} className="h-8 w-8 rounded" />
            <span className="text-base font-bold sm:text-xl">
              <span className="hidden sm:inline">文风字库 - </span>
              管理后台
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop Navigation */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <UserNav />

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Image
                    src="/icon.webp"
                    alt="Logo"
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded"
                  />
                  管理菜单
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col space-y-3">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="border-t pt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/" onClick={() => setOpen(false)}>
                      <Home className="mr-2 h-4 w-4" />
                      返回首页
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
