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
    { href: '/admin/drivers', icon: Truck, text: 'إدارة المناديب' },
    { href: '/admin/reports/drivers', icon: BarChart2, text: 'أداء المناديب' },
    { href: '/admin/products', icon: Package, text: 'إدارة المنتجات' },
    { href: '/admin/categories', icon: Shapes, text: 'إدارة الفئات' },
    { href: '/admin/cities', icon: MapPin, text: 'إدارة المدن' },
    { href: '/admin/wallet-requests', icon: Wallet, text: 'شحن المحافظ' },
    { href: '/admin/bank-accounts', icon: Banknote, text: 'حسابات البنوك' },
    { href: '/admin/vip-plans', icon: Crown, text: 'باقات VIP' },
    { href: '/admin/points-system', icon: Star, text: 'نظام الولاء' },
    { href: '/admin/marketing/coupons', icon: TicketPercent, text: 'كوبونات الخصم' },
    { href: '/admin/marketing/banners', icon: GalleryHorizontal, text: 'الإعلانات' },
    { href: '/admin/donations', icon: HeartHandshake, text: 'إدارة التبرعات' },
    { href: '/admin/reports/sales', icon: TrendingUp, text: 'تقارير المبيعات' },
    { href: '/admin/settings', icon: Settings, text: 'إعدادات النظام' },
    { href: '/admin/support', icon: MessageSquare, text: 'الدعم الفني' },
    { href: '/admin/reports/data-seeder', icon: Wrench, text: 'أدوات المطورين' },
];

export function AdminSidebar({ isMobileOpen, setIsMobileOpen, isCollapsed }) {
  const pathname = usePathname();
  // On mobile view, the sidebar should never be in a "collapsed" state when it's open.
  // The `isCollapsed` prop is for the desktop-only collapsed view.
  const shouldBeCollapsed = isCollapsed && !isMobileOpen;

  const NavLink = ({ href, icon: Icon, text, isLogout = false }) => {
    const isActive = pathname === href;
    return (
      <Link href={href} onClick={() => isMobileOpen && setIsMobileOpen(false)} title={shouldBeCollapsed ? text : ''}>
        <span className={cn(
            "group relative flex items-center gap-3 px-4 py-3 transition-colors duration-200",
            isActive
              ? "bg-primary text-primary-foreground font-black rounded-xl"
              : isLogout 
              ? 'font-bold text-red-500 hover:bg-red-50 rounded-lg'
              : `font-bold text-gray-500 hover:bg-gray-100 rounded-lg`,
            shouldBeCollapsed && 'justify-center'
        )}>
          {isActive && <div className="absolute right-0 h-6 w-1 bg-primary rounded-r-full" />}
          <Icon className={cn(
              'w-5 h-5 shrink-0 transition-colors', 
              isActive ? 'text-primary-foreground' : isLogout ? 'text-red-500' : 'text-gray-400 group-hover:text-primary'
          )} />
          <span className={cn('transition-opacity duration-200', shouldBeCollapsed ? 'sr-only' : 'opacity-100')}>{text}</span>
        </span>
      </Link>
    );
  };
  
  return (
    <aside
      className={cn(
        // Always fixed, positioned on the right
        "fixed top-0 right-0 h-screen z-[101] bg-white flex flex-col transition-all duration-300 ease-in-out border-l",
        
        // Desktop state (always visible)
        isCollapsed ? 'lg:w-20' : 'lg:w-64',

        // Mobile state (slides in and out)
        isMobileOpen ? 'translate-x-0 shadow-2xl w-64' : 'translate-x-full lg:translate-x-0'
    )}>
        {/* Header */}
        <div className={cn("flex items-center h-20 border-b shrink-0 px-4 gap-3 overflow-hidden", shouldBeCollapsed && "justify-center")}>
             <Image src="/logo-app.png" alt="أبشر Logo" width={40} height={40} className="transition-all duration-300 object-contain flex-shrink-0 rounded-lg shadow-md"/>
             {!shouldBeCollapsed && 
                <div>
                    <h2 className="font-black text-lg text-gray-800 whitespace-nowrap">إدارة أبشر</h2>
                    <p className="text-xs text-gray-400 font-bold tracking-widest">ADMIN CONSOLE</p>
                </div>
             }
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
            {navLinks.map((link) => <NavLink key={link.href} {...link} />)}
        </nav>
        
        {/* Footer */}
        <div className="px-3 py-4 border-t shrink-0">
             <NavLink href="/login" icon={LogOut} text="تسجيل الخروج" isLogout={true} />
        </div>
    </aside>
  );
}
