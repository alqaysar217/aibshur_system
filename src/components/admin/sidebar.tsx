'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Store, ShoppingBag, Truck, CreditCard, AreaChart,
  BadgePercent, Settings, LifeBuoy, ShieldCheck, BarChart2,
  ChevronDown, LogOut, Package, ChevronsRight, CircleDot, UserPlus, Building2,
  Ticket, GalleryHorizontal, Users, Banknote, Wallet, Crown, HeartHandshake, Star, FileText,
  MessageSquareQuote, ClipboardCheck, Database, SlidersHorizontal, UserCog, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '../ui/button';
import { useAuth, useUser } from '@/firebase';
import InstallPwaButton from './install-pwa-button';

const navGroups = [
    {
        title: 'الرئيسية',
        links: [
            { name: 'لوحة التحكم', href: '/admin', icon: LayoutDashboard },
        ]
    },
    {
        title: 'العمليات اليومية',
        links: [
            { name: 'إدارة الطلبات', href: '/admin/confirm-orders', icon: ClipboardCheck },
        ]
    },
     {
        title: 'إدارة المواعيد',
        links: [
            { name: 'الطلبات المجدولة', href: '/admin/appointments', icon: Calendar },
        ]
    },
    {
        title: 'الإدارة الأساسية',
        links: [
            { name: 'إدارة المستخدمين', href: '/admin/users', icon: Users },
            { name: 'إدارة المتاجر', href: '/admin/stores', icon: Store },
            { name: 'إدارة المنتجات', href: '/admin/products', icon: Package },
            { name: 'إدارة الفئات', href: '/admin/categories', icon: BarChart2 },
            { name: 'إدارة المدن', href: '/admin/cities', icon: Building2 },
        ]
    },
    {
        title: 'الإدارة المالية',
        links: [
            { name: 'شحن المحافظ (إيداع)', href: '/admin/wallet-requests', icon: Wallet },
            { name: 'حسابات البنوك', href: '/admin/bank-accounts', icon: Banknote },
            { name: 'باقات VIP', href: '/admin/vip-plans', icon: Crown },
            { name: 'نظام الولاء والنقاط', href: '/admin/points-system', icon: Star },
        ]
    },
    {
        title: 'التسويق والنمو',
        links: [
            { name: 'كوبونات الخصم', href: '/admin/marketing/coupons', icon: Ticket },
            { name: 'الإعلانات المتحركة', href: '/admin/marketing/banners', icon: GalleryHorizontal },
            { name: 'إدارة التبرعات', href: '/admin/donations', icon: HeartHandshake },
        ]
    },
    {
        title: 'أداء المناديب',
        links: [
            { name: 'كشف حساب المناديب', href: '/admin/reports/drivers', icon: Truck },
        ]
    },
    {
        title: 'التقارير والتحليلات',
        links: [
            { name: 'تقارير المبيعات', href: '/admin/reports/sales', icon: AreaChart },
            { name: 'أدوات المطورين', href: '/admin/reports/data-seeder', icon: Database },
        ]
    }
];

const settingsNav = [
  { name: 'إعدادات النظام', href: '/admin/settings', icon: UserCog },
  { name: 'الدعم الفني', href: '/admin/support', icon: LifeBuoy },
];

export function AdminSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { userData } = useUser();

  const handleLinkClick = () => {
    if(isMobileOpen) {
      setIsMobileOpen(false);
    }
  }

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  }

  return (
    <aside className={cn(
      "fixed top-0 right-0 h-screen z-[101] bg-card border-l border-border transition-all duration-300 ease-in-out lg:relative lg:translate-x-0",
      isCollapsed ? 'w-20' : 'w-64',
      isMobileOpen ? 'translate-x-0' : 'translate-x-full'
    )}>
      <div className="flex flex-col h-full">
        <div className={cn("flex items-center gap-2 p-4 border-b border-border h-16", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && <h1 className="text-xl font-black text-primary">أبشر ERP</h1>}
           <Button variant="ghost" size="icon" className="text-muted-foreground hidden lg:flex" onClick={() => setIsCollapsed(!isCollapsed)}>
                <SlidersHorizontal className="h-5 w-5" />
           </Button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {navGroups.map((group) => {
            const isAdminOnlyGroup = ['الإدارة المالية', 'التقارير والتحليلات', 'إدارة المواعيد', 'أداء المناديب'].includes(group.title);
            if (isAdminOnlyGroup && !userData?.roles?.is_admin) {
              return null; // Don't render admin-only groups for non-admins
            }
            return (
              <div key={group.title}>
                  {!isCollapsed && <h2 className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">{group.title}</h2>}
                  <div className="space-y-1">
                  {group.links.map((item) => (
                      <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                          "flex items-center text-sm font-black p-2 rounded-lg transition-colors",
                          pathname === item.href
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                          isCollapsed && "justify-center"
                      )}
                      title={isCollapsed ? item.name : ''}
                      >
                      <item.icon className={cn("w-5 h-5", !isCollapsed && 'ml-3')} />
                      {!isCollapsed && <span>{item.name}</span>}
                      </Link>
                  ))}
                  </div>
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border mt-auto">
            <div className="space-y-1">
             {settingsNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center text-sm font-black p-2 rounded-lg transition-colors",
                  pathname.startsWith(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                    isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.name : ''}
              >
                <item.icon className={cn("w-5 h-5", !isCollapsed && 'ml-3')} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
            </div>
           <InstallPwaButton isCollapsed={isCollapsed} />
           <Button onClick={handleLogout} variant="ghost" className="w-full justify-start font-black text-red-500 hover:bg-red-500/10 hover:text-red-400 mt-2">
             <LogOut className={cn("w-5 h-5", !isCollapsed && 'ml-2')} />
             {!isCollapsed && <span>تسجيل الخروج</span>}
           </Button>
        </div>
      </div>
    </aside>
  );
}
