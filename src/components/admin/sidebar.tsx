'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Store, ShoppingBag, Truck, CreditCard, AreaChart,
  BadgePercent, Settings, LifeBuoy, ShieldCheck, BarChart2,
  ChevronDown, LogOut, Package, ChevronsRight, CircleDot, UserPlus, Building2,
  Ticket, GalleryHorizontal, Users, Banknote, Wallet, Crown, HeartHandshake, Star, FileText,
  MessageSquareQuote, ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '../ui/button';
import { useAuth } from '@/firebase'; // Using firebase hook

const mainNav = [
  { name: 'لوحة التحكم', href: '/admin', icon: LayoutDashboard },
  { name: 'الطلبات', href: '/admin/orders', icon: ShoppingBag },
  { name: 'المستخدمون', href: '/admin/users', icon: Users },
  { name: 'المتاجر', href: '/admin/stores', icon: Store },
  { name: 'المنتجات', href: '/admin/products', icon: Package },
  { name: 'الفئات', href: '/admin/categories', icon: BarChart2 },
  { name: 'المدن', href: '/admin/cities', icon: Building2 },
];

const marketingNav = {
  title: 'التسويق والإعلانات',
  icon: BadgePercent,
  links: [
    { name: 'كوبونات الخصم', href: '/admin/marketing/coupons', icon: Ticket },
    { name: 'الإعلانات المتحركة', href: '/admin/marketing/banners', icon: GalleryHorizontal },
  ]
};

const financeNav = {
  title: 'الشؤون المالية',
  icon: CreditCard,
  links: [
    { name: 'شحن المحفظة (إيداع)', href: '/admin/wallet-requests', icon: Wallet },
    { name: 'إدارة الحسابات البنكية', href: '/admin/bank-accounts', icon: Banknote },
    { name: 'السجل المالي المرجعي', href: '/admin/financial-logs', icon: FileText },
  ]
};

const servicesNav = {
    title: 'الخدمات والاشتراكات',
    icon: Settings,
    links: [
      { name: 'باقات أبشر VIP', href: '/admin/vip-plans', icon: Crown },
      { name: 'نظام النقاط والولاء', href: '/admin/points-system', icon: Star },
      { name: 'إدارة التبرعات', href: '/admin/donations', icon: HeartHandshake },
    ]
};

const csNav = {
  title: 'قسم خدمة العملاء',
  icon: MessageSquareQuote,
  links: [
    { name: 'تأكيد وتوثيق الطلبات', href: '/admin/confirm-orders', icon: ClipboardCheck },
  ]
};

const reportsNav = {
  title: 'التقارير',
  icon: AreaChart,
  links: [
    { name: 'تقارير المبيعات', href: '/admin/reports/sales', icon: CircleDot },
    { name: 'أداء المناديب', href: '/admin/reports/drivers', icon: CircleDot },
  ]
};


const settingsNav = [
  { name: 'إعدادات النظام', href: '/admin/settings', icon: Settings },
  { name: 'الدعم الفني', href: '/admin/support', icon: LifeBuoy },
];

export function AdminSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const pathname = usePathname();
  const auth = useAuth(); // Using firebase hook

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

  const NavGroup = ({ title, icon: Icon, links }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isAnyLinkActive = links.some(link => pathname.startsWith(link.href));

    return (
      <div className='py-1'>
        <button onClick={() => setIsOpen(!isOpen)} className={cn("w-full flex items-center text-sm font-bold p-2 rounded-lg transition-colors", isAnyLinkActive ? 'text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800')}>
          <Icon className="w-5 h-5 ml-3" />
          {!isCollapsed && <span className="flex-1 text-right">{title}</span>}
          {!isCollapsed && <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />}
        </button>
        {isOpen && !isCollapsed && (
          <div className="mt-1 space-y-1 mr-4 border-r-2 border-gray-200 pr-3">
            {links.map(link => (
              <Link
                key={link.name}
                href={link.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center text-sm font-bold p-2 rounded-lg transition-colors",
                  pathname.startsWith(link.href)
                    ? 'text-primary'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                )}
              >
                <link.icon className="w-4 h-4 ml-2" />
                <span>{link.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={cn(
      "fixed top-0 right-0 h-screen z-[101] bg-white border-l border-gray-100 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0",
      isCollapsed ? 'w-20' : 'w-64',
      isMobileOpen ? 'translate-x-0' : 'translate-x-full'
    )}>
      <div className="flex flex-col h-full">
        <div className={cn("flex items-center gap-2 p-4 border-b border-gray-100 h-16", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && <h1 className="text-xl font-black text-primary">أبشر | لوحة التحكم</h1>}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {mainNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center text-sm font-black p-2 rounded-lg transition-colors",
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon className={cn("w-5 h-5", !isCollapsed && 'ml-3')} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          ))}
          
          <NavGroup {...financeNav} />
          <NavGroup {...marketingNav} />
          <NavGroup {...servicesNav} />
          <NavGroup {...csNav} />
          <NavGroup {...reportsNav} />

          <div className="pt-4 mt-4 border-t border-gray-100 space-y-1">
             {settingsNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center text-sm font-black p-2 rounded-lg transition-colors",
                  pathname.startsWith(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
                    isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.name : ''}
              >
                <item.icon className={cn("w-5 h-5", !isCollapsed && 'ml-3')} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
           <Button onClick={handleLogout} variant="ghost" className="w-full justify-start font-black text-red-500 hover:bg-red-50 hover:text-red-600">
             <LogOut className={cn("w-5 h-5", !isCollapsed && 'ml-2')} />
             {!isCollapsed && <span>تسجيل الخروج</span>}
           </Button>
        </div>
      </div>
    </aside>
  );
}
