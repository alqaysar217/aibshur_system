'use client';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Wallet,
  User as UserIcon,
  Settings,
  LogOut,
  Bike,
  Shield,
  Users,
  Building,
  CreditCard,
} from 'lucide-react';
import type { User, UserRole } from '@/lib/types';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { getAuth, signOut } from 'firebase/auth';

const getRoleName = (role: UserRole) => {
  switch (role) {
    case 'client':
      return 'عميل';
    case 'driver':
      return 'مندوب';
    case 'admin':
      return 'مدير';
    case 'store_owner':
      return 'صاحب متجر';
    default:
      return 'مستخدم';
  }
};

const getNavLinks = (role: UserRole) => {
  const baseLinks = [
    { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/profile', label: 'الملف الشخصي', icon: UserIcon },
  ];

  const clientLinks = [
    { href: '/stores', label: 'المتاجر', icon: ShoppingBag },
    { href: '/orders', label: 'طلباتي', icon: ClipboardList },
    { href: '/wallet', label: 'المحفظة', icon: Wallet },
  ];

  const driverLinks = [
    { href: '/orders', label: 'الطلبات المتاحة', icon: ClipboardList },
    { href: '/wallet', label: 'المالية', icon: Wallet },
  ];

  const adminLinks = [
    { href: '/admin/users', label: 'المستخدمين', icon: Users },
    { href: '/admin/stores', label: 'المتاجر', icon: ShoppingBag },
    { href: '/admin/orders', label: 'الطلبات', icon: ClipboardList },
    { href: '/admin/finances', label: 'المالية', icon: CreditCard },
    { href: '/admin/cities', label: 'إدارة المدن', icon: Building },
    { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ];

  switch (role) {
    case 'client':
      return [...baseLinks.slice(0, 1), ...clientLinks, ...baseLinks.slice(1)];
    case 'driver':
      return [...baseLinks.slice(0, 1), ...driverLinks, ...baseLinks.slice(1)];
    case 'admin':
      return [...baseLinks.slice(0, 1), ...adminLinks];
    default:
      return baseLinks;
  }
};

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'client':
      return <UserIcon className="w-4 h-4" />;
    case 'driver':
      return <Bike className="w-4 h-4" />;
    case 'admin':
      return <Shield className="w-4 h-4" />;
    case 'store_owner':
      return <ShoppingBag className="w-4 h-4" />;
    default:
      return <UserIcon className="w-4 h-4" />;
  }
};

const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
}


export default function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const navLinks = getNavLinks(user.role);

  return (
    <Sidebar side="right" className="border-l">
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.profile_image} alt={user.full_name} />
            <AvatarFallback>{user.full_name ? user.full_name.charAt(0) : 'A'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{user.full_name}</span>
            <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
              {getRoleIcon(user.role)}
              <span>{getRoleName(user.role)}</span>
            </Badge>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  className="justify-end"
                >
                  <span>{link.label}</span>
                  <link.icon className="w-5 h-5" />
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="justify-end" onClick={handleSignOut}>
              <span>تسجيل الخروج</span>
              <LogOut className="w-5 h-5" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
