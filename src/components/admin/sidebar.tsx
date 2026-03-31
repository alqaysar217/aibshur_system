'use client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, ShoppingCart, Users, Building, Truck, BarChart2, Package, Shapes, MapPin,
  Wallet, Banknote, Crown, Star, TicketPercent, GalleryHorizontal, HeartHandshake, TrendingUp, Settings,
  MessageSquare, Wrench, LogOut
} from 'lucide-react';
import Image from 'next/image';

const navLinks = [
  { href: '/admin', icon: LayoutDashboard, text: 'الرئيسية' },
  { href: '/admin/appointments', icon: Calendar, text: 'إدارة المواعيد' },
  { href: '/admin/confirm-orders', icon: ShoppingCart, text: 'إدارة الطلبات' },
  { href: '/admin/users', icon: Users, text: 'إدارة المستخدمين' },
  { href: '/admin/stores', icon: Building, text: 'إدارة المتاجر' },
  { href: '/admin/products', icon: Package, text: 'إدارة المنتجات' },
  { href: '/admin/reports/drivers', icon: Truck, text: 'أداء المناديب' },
  { href: '/admin/categories', icon: Shapes, text: 'إدارة الفئات' },
  { href: '/admin/cities', icon: MapPin, text: 'إدارة المدن والمناطق' },
  { href: '/admin/wallet-requests', icon: Wallet, text: 'شحن المحافظ' },
  { href: '/admin/bank-accounts', icon: Banknote, text: 'حسابات البنوك' },
  { href: '/admin/vip-plans', icon: Crown, text: 'باقات VIP' },
  { href: '/admin/points-system', icon: Star, text: 'نظام الولاء والنقاط' },
  { href: '/admin/marketing/coupons', icon: TicketPercent, text: 'كوبونات الخصم' },
  { href: '/admin/marketing/banners', icon: GalleryHorizontal, text: 'الإعلانات المتحركة' },
  { href: '/admin/donations', icon: HeartHandshake, text: 'إدارة التبرعات' },
  { href: '/admin/reports/sales', icon: TrendingUp, text: 'تقارير المبيعات' },
  { href: '/admin/settings', icon: Settings, text: 'إعدادات النظام' },
  { href: '/admin/support', icon: MessageSquare, text: 'الدعم الفني' },
  { href: '/admin/reports/data-seeder', icon: Wrench, text: 'أدوات المطورين' },
];


export function AdminSidebar({ isMobileOpen, setIsMobileOpen }) {
  const pathname = usePathname();

  const NavLink = ({ href, icon: Icon, text }) => {
    const isActive = pathname === href;
    return (
      <Link href={href} onClick={() => isMobileOpen && setIsMobileOpen(false)}>
        <span
          className={cn(
            'flex items-center gap-4 px-4 py-3 text-gray-700 font-bold rounded-lg transition-colors duration-200',
            isActive ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'
          )}
        >
          <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-gray-400')} />
          <span>{text}</span>
        </span>
      </Link>
    );
  };
  
  return (
    <aside className={cn(
      "fixed top-0 right-0 h-screen z-[101] bg-white border-l border-border transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 w-64 flex flex-col",
      isMobileOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
    )}>
        {/* Header */}
        <div className="flex items-center justify-center h-20 border-b shrink-0">
             <Image src="https://i.postimg.cc/L8g1v4w1/absher-logo-2.png" alt="أبشر Logo" width={120} height={40} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {navLinks.map((link) => <NavLink key={link.href} {...link} />)}
        </nav>
        
        {/* Footer */}
        <div className="px-4 py-4 border-t shrink-0">
             <Link href="#">
                <span
                className={cn(
                    'flex items-center gap-4 px-4 py-3 mt-2 font-bold rounded-lg transition-colors duration-200 text-red-500 bg-red-50 hover:bg-red-100'
                )}
                >
                <LogOut className={'w-5 h-5'} />
                <span>تسجيل الخروج</span>
                </span>
            </Link>
        </div>
    </aside>
  );
}
