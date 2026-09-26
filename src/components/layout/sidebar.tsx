'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  Palette,
  RefreshCw,
  ShieldBan,
  ShieldCheck,
  Tag,
  Type,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type SidebarItem = {
  title: string;
  href?: string;
  icon: any;
  items?: {
    title: string;
    href: string;
    icon: any;
  }[];
};

const securityItems = [
  {
    title: '安全开关',
    href: '/admin/security-switches',
    icon: ShieldCheck,
  },
  {
    title: '白名单',
    href: '/admin/domain-whitelist',
    icon: ShieldCheck,
  },
  {
    title: '黑名单',
    href: '/admin/domain-blacklist',
    icon: ShieldBan,
  },
  {
    title: 'API 密钥',
    href: '/admin/api-keys',
    icon: KeyRound,
  },
].filter((item) => item.href !== '/admin/ip-whitelist');

const sidebarItems: SidebarItem[] = [
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
    title: '认领审核',
    href: '/admin/claims',
    icon: BadgeCheck,
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
  {
    title: '安全中心',
    icon: ShieldCheck,
    items: securityItems,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    sidebarItems
      .filter(
        (item) =>
          item.items &&
          item.items.some((subItem) => pathname.startsWith(subItem.href))
      )
      .map((item) => item.title)
  );

  // Check if any item in a group is active, if so, open that group
  useEffect(() => {
    const groupsToOpen = sidebarItems
      .filter(
        (item) =>
          item.items && item.items.some((subItem) => pathname.startsWith(subItem.href))
      )
      .map((item) => item.title);

    if (groupsToOpen.length > 0) {
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => {
        setOpenGroups((prev) => {
          const unique = new Set([...prev, ...groupsToOpen]);
          // Only update if there are new groups to open
          if (unique.size === prev.length) {
            return prev;
          }
          return Array.from(unique);
        });
      }, 0);
    }
  }, [pathname]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  return (
    <aside className="bg-background fixed top-16 left-0 z-30 hidden h-[calc(100vh-4rem)] w-64 border-r md:block">
      <nav className="space-y-1 p-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;

          if (item.items) {
            const isOpen = openGroups.includes(item.title);
            const isGroupActive = item.items.some((subItem) =>
              pathname.startsWith(subItem.href)
            );

            return (
              <Collapsible
                key={item.title}
                open={isOpen}
                onOpenChange={() => toggleGroup(item.title)}
                className="space-y-1"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isGroupActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {item.title}
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-4">
                  {item.items.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = pathname === subItem.href;

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isSubActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <SubIcon className="h-4 w-4" />
                        {subItem.title}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href!}
              href={item.href!}
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
