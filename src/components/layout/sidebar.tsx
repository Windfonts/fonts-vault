'use client';

import { cn } from '@/lib/utils';
import { FolderOpen, LayoutDashboard, Palette, RefreshCw, Tag, Type } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
  {
    title: '仪表板',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: '字体管理',
    href: '/admin/fonts',
    icon: Type,
  },
  {
    title: '厂商管理',
    href: '/admin/brands',
    icon: Tag,
  },
  {
    title: '分类管理',
    href: '/admin/categories',
    icon: FolderOpen,
  },
  {
    title: '风格管理',
    href: '/admin/styles',
    icon: Palette,
  },
  {
    title: '同步管理',
    href: '/admin/sync',
    icon: RefreshCw,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-background fixed top-16 left-0 z-30 hidden h-[calc(100vh-4rem)] w-64 border-r md:block">
      <nav className="space-y-1 p-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
