'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, ClipboardCheck, Users, Store, Truck, Package, BarChart2, Building2, Wallet,
  Banknote, Crown, Star, Ticket, GalleryHorizontal, HeartHandshake, AreaChart, Settings, LifeBuoy, Database,
  LogOut, PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '@/firebase';

const navLinks = [
    { name: 'الرئيسية', href: '/admin', icon: LayoutDashboard },
    { name: 'إدارة المواعيد', href: '/admin/appointments', icon: Calendar },
    { name: 'إدارة الطلبات', href: '/admin/confirm-orders', icon: ClipboardCheck },
    { name: 'إدارة المستخدمين', href: '/admin/users', icon: Users },
    { name: 'إدارة المتاجر', href: '/admin/stores', icon: Store },
    { name: 'إدارة المناديب', href: '/admin/users', icon: Truck },
    { name: 'أداء المناديب', href: '/admin/reports/drivers', icon: PieChart },
    { name: 'إدارة المنتجات', href: '/admin/products', icon: Package },
    { name: 'إدارة الفئات', href: '/admin/categories', icon: BarChart2 },
    { name: 'إدارة المدن والمناطق', href: '/admin/cities', icon: Building2 },
    { name: 'شحن المحافظ', href: '/admin/wallet-requests', icon: Wallet },
    { name: 'حسابات البنوك', href: '/admin/bank-accounts', icon: Banknote },
    { name: 'باقات VIP', href: '/admin/vip-plans', icon: Crown },
    { name: 'نظام الولاء والنقاط', href: '/admin/points-system', icon: Star },
    { name: 'كوبونات الخصم', href: '/admin/marketing/coupons', icon: Ticket },
    { name: 'الإعلانات المتحركة', href: '/admin/marketing/banners', icon: GalleryHorizontal },
    { name: 'إدارة التبرعات', href: '/admin/donations', icon: HeartHandshake },
    { name: 'تقارير المبيعات', href: '/admin/reports/sales', icon: AreaChart },
    { name: 'إعدادات النظام', href: '/admin/settings', icon: Settings },
    { name: 'الدعم الفني', href: '/admin/support', icon: LifeBuoy },
    { name: 'أدوات المطورين', href: '/admin/reports/data-seeder', icon: Database },
];


export function AdminSidebar({ isMobileOpen, setIsMobileOpen }) {
  const pathname = usePathname();
  const auth = useAuth();

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
      "fixed top-0 right-0 h-screen z-[101] bg-white border-l border-border transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 w-64",
      isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:w-64'
    )}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b border-border h-16">
          <h1 className="text-xl font-black text-primary">أبشر ERP</h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                    "flex items-center text-sm font-bold p-3 rounded-lg transition-colors",
                    pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className={cn("w-5 h-5 ml-3", pathname === item.href && "text-primary")} />
                <span>{item.name}</span>
              </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border mt-auto">
           <Button onClick={handleLogout} variant="ghost" className="w-full font-bold text-red-500 hover:bg-red-500/10 hover:text-red-400 flex items-center p-3 text-sm rounded-lg justify-start">
             <LogOut className="w-5 h-5 ml-3" />
             <span>تسجيل الخروج</span>
           </Button>
        </div>
      </div>
    </aside>
  );
}
