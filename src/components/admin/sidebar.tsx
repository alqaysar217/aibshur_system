'use client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import Users from 'lucide-react/dist/esm/icons/users';
import Building from 'lucide-react/dist/esm/icons/building';
import Truck from 'lucide-react/dist/esm/icons/truck';
import BarChart2 from 'lucide-react/dist/esm/icons/bar-chart-2';
import Package from 'lucide-react/dist/esm/icons/package';
import Shapes from 'lucide-react/dist/esm/icons/shapes';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Star from 'lucide-react/dist/esm/icons/star';
import TicketPercent from 'lucide-react/dist/esm/icons/ticket-percent';
import GalleryHorizontal from 'lucide-react/dist/esm/icons/gallery-horizontal';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Settings from 'lucide-react/dist/esm/icons/settings';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Wrench from 'lucide-react/dist/esm/icons/wrench';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
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
  const shouldBeCollapsed = isCollapsed && !isMobileOpen;

  const NavLink = ({ href, icon: Icon, text, isLogout = false }) => {
    const isActive = pathname === href;
    return (
      <Link href={href} onClick={() => isMobileOpen && setIsMobileOpen(false)} title={shouldBeCollapsed ? text : ''}>
        <span className={cn(
            "group relative flex items-center gap-3 px-4 py-3 transition-colors duration-200",
            isActive
              ? "bg-primary text-primary-foreground font-black rounded-xl shadow-sm"
              : isLogout 
              ? 'font-bold text-red-500 hover:bg-red-50 rounded-lg'
              : `font-bold text-muted-foreground hover:bg-accent rounded-lg`,
            shouldBeCollapsed && 'justify-center'
        )}>
          {isActive && <div className="absolute -right-1.5 h-6 w-1 bg-primary rounded-r-full" />}
          <Icon className={cn(
              'w-5 h-5 shrink-0 transition-colors', 
              isActive ? 'text-primary-foreground' : isLogout ? 'text-red-500' : 'text-muted-foreground group-hover:text-primary'
          )} />
          <span className={cn('transition-opacity duration-200', shouldBeCollapsed ? 'sr-only' : 'opacity-100')}>{text}</span>
        </span>
      </Link>
    );
  };
  
  return (
    <aside
      className={cn(
        "fixed top-0 right-0 h-screen z-[101] bg-card flex flex-col transition-all duration-300 ease-in-out border-l",
        isMobileOpen ? 'translate-x-0 shadow-2xl w-64' : 'translate-x-full lg:translate-x-0',
        shouldBeCollapsed ? 'lg:w-20' : 'lg:w-64'
    )}>
        <div className={cn("flex items-center h-20 border-b shrink-0 px-4 gap-3 overflow-hidden", shouldBeCollapsed && "justify-center")}>
             <Image src="/logo-app.png" alt="أبشر Logo" width={48} height={48} className="transition-all duration-300 object-contain flex-shrink-0 rounded-lg shadow-md"/>
             {!shouldBeCollapsed && 
                <div>
                    <h2 className="font-black text-lg text-foreground whitespace-nowrap">إدارة أبشر</h2>
                    <p className="text-xs text-muted-foreground font-bold tracking-widest">ADMIN CONSOLE</p>
                </div>
             }
        </div>

        <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
            {navLinks.map((link) => <NavLink key={link.href} {...link} />)}
        </nav>
        
        <div className="px-3 py-4 border-t shrink-0">
             <NavLink href="/login" icon={LogOut} text="تسجيل الخروج" isLogout={true} />
        </div>
    </aside>
  );
}
