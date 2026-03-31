'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Users,
  Store,
  Truck,
  Package,
  BarChart2,
  Building2,
  Wallet,
  Banknote,
  Crown,
  Star,
  Ticket,
  GalleryHorizontal,
  HeartHandshake,
  AreaChart,
  Settings,
  LifeBuoy,
  Database,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useAuth, useUser } from '@/firebase';
import InstallPwaButton from './install-pwa-button';

const navLinks = [
    { name: 'لوحة التحكم', href: '/admin', icon: LayoutDashboard },
    { name: 'إدارة المواعيد', href: '/admin/appointments', icon: Calendar },
    { name: 'إدارة الطلبات', href: '/admin/confirm-orders', icon: ClipboardCheck },
    { name: 'إدارة المستخدمين', href: '/admin/users', icon: Users },
    { name: 'إدارة المتاجر', href: '/admin/stores', icon: Store },
    { name: 'إدارة المناديب', href: '/admin/users', icon: Truck }, 
    { name: 'أداء المناديب', href: '/admin/reports/drivers', icon: BarChart2 },
    { name: 'إدارة المنتجات', href: '/admin/products', icon: Package },
    { name: 'إدارة الفئات', href: '/admin/categories', icon: BarChart2 },
    { name: 'إدارة المدن', href: '/admin/cities', icon: Building2 },
    { name: 'شحن المحافظ', href: '/admin/wallet-requests', icon: Wallet },
    { name: 'حسابات البنوك', href: '/admin/bank-accounts', icon: Banknote },
    { name: 'باقات VIP', href: '/admin/vip-plans', icon: Crown },
    { name: 'نظام الولاء', href: '/admin/points-system', icon: Star },
    { name: 'كوبونات الخصم', href: '/admin/marketing/coupons', icon: Ticket },
    { name: 'الإعلانات', href: '/admin/marketing/banners', icon: GalleryHorizontal },
    { name: 'إدارة التبرعات', href: '/admin/donations', icon: HeartHandshake },
    { name: 'تقارير المبيعات', href: '/admin/reports/sales', icon: AreaChart },
    { name: 'إعدادات النظام', href: '/admin/settings', icon: Settings },
    { name: 'الدعم الفني', href: '/admin/support', icon: LifeBuoy },
    { name: 'أدوات المطورين', href: '/admin/reports/data-seeder', icon: Database },
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

  // A simple view for non-admins, only showing logout
  if (userData && !userData.roles?.is_admin) {
      return (
           <aside className={cn(
            "fixed top-0 right-0 h-screen z-[101] bg-card border-l border-border transition-all duration-300 ease-in-out lg:relative lg:translate-x-0",
            isCollapsed ? 'w-20' : 'w-64',
            isMobileOpen ? 'translate-x-0' : 'translate-x-full'
          )}>
            <div className="flex flex-col h-full p-3">
                 <div className={cn("flex items-center gap-2 p-4 border-b border-border h-16", isCollapsed ? "justify-center" : "justify-start")}>
                    {!isCollapsed && <h1 className="text-xl font-black text-primary">أبشر</h1>}
                </div>
                 <Button onClick={handleLogout} variant="ghost" className="w-full justify-start font-black text-red-500 hover:bg-red-500/10 hover:text-red-400 mt-auto">
                    <LogOut className={cn("w-5 h-5", !isCollapsed && 'ml-3')} />
                    {!isCollapsed && <span>تسجيل الخروج</span>}
                </Button>
            </div>
           </aside>
      )
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

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => (
              <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                  "flex items-center text-sm font-bold p-2.5 rounded-lg transition-colors",
                  pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                  isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : ''}
              >
              <item.icon className={cn("w-5 h-5", !isCollapsed && 'ml-3', pathname === item.href && "text-primary")} />
              {!isCollapsed && <span>{item.name}</span>}
              </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border mt-auto">
           <InstallPwaButton isCollapsed={isCollapsed} />
           <Button onClick={handleLogout} variant="ghost" className="w-full font-bold text-red-500 hover:bg-red-500/10 hover:text-red-400 mt-2 flex items-center p-2.5 text-sm rounded-lg justify-start">
             <LogOut className={cn("w-5 h-5", !isCollapsed && 'ml-3')} />
             {!isCollapsed && <span>تسجيل الخروج</span>}
           </Button>
        </div>
      </div>
    </aside>
  );
}
