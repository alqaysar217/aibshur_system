'use client';

import { Menu, Bell, PanelRightClose, PanelLeftClose, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useAuth } from '@/firebase';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';

interface AdminTopBarProps {
  toggleMobile: () => void;
  toggleCollapse: () => void;
  isCollapsed: boolean;
}

export function AdminTopBar({ toggleMobile, toggleCollapse, isCollapsed }: AdminTopBarProps) {
  const { userData, loading: userLoading } = useUser();
  const auth = useAuth();
  
  const handleLogout = () => {
      if (auth) {
          auth.signOut();
      }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-4 md:px-8 bg-white/80 backdrop-blur-sm border-b">
      <div className="flex items-center gap-2">
         {/* Mobile Menu Toggle */}
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobile}
            className="lg:hidden"
        >
            <Menu className="w-6 h-6" />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
        {/* Desktop Collapse Toggle */}
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="hidden lg:flex"
        >
            {isCollapsed ? <PanelLeftClose className="w-6 h-6" /> : <PanelRightClose className="w-6 h-6" />}
            <span className="sr-only">Toggle Sidebar Collapse</span>
        </Button>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5"/>
            <span className="sr-only">Notifications</span>
        </Button>
        
        {userLoading ? (
            <Skeleton className="h-10 w-40" />
        ) : userData ? (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 p-1 h-auto rounded-full">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={userData.profile_image} alt={userData.full_name || 'User'}/>
                            <AvatarFallback>{userData.full_name ? userData.full_name[0].toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold">{userData.full_name}</p>
                            <p className="text-xs text-muted-foreground">{userData.roles?.is_admin ? 'مدير النظام' : 'مستخدم'}</p>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem asChild><Link href="/admin/profile">الملف الشخصي</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/settings">الإعدادات</Link></DropdownMenuItem>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        تسجيل الخروج
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ) : null}

      </div>

    </header>
  );
}
