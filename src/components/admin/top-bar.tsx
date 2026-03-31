'use client';

import { Menu, Bell, ChevronDown } from 'lucide-react';
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
import { useUser, useAuth } from '@/firebase'; // Using the real user hook
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';

interface AdminTopBarProps {
  toggleMobile: () => void;
  toggleDesktop: () => void;
}

export function AdminTopBar({ toggleMobile }: AdminTopBarProps) {
  const { userData, loading } = useUser(); // Get real user data
  const auth = useAuth();

  const handleLogout = () => {
    if(auth) {
      auth.signOut();
    }
  }

  const UserAvatar = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="hidden md:flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      );
    }

    if (!userData) {
      return (
        <Link href="/login">
            <Button variant="outline" size="sm" className='font-bold'>تسجيل الدخول</Button>
        </Link>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={userData.profile_image} alt={userData.full_name} />
              <AvatarFallback>{userData.full_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-black text-foreground">{userData.full_name}</span>
              <span className="text-xs font-bold text-muted-foreground capitalize">
                {userData.roles?.is_admin ? 'مدير نظام' : 'مستخدم'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:flex" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl shadow-lg w-56">
          <DropdownMenuLabel className='font-bold'>حسابي</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="font-bold rounded-lg" asChild>
            <Link href="/profile">الملف الشخصي</Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="font-bold rounded-lg">الإعدادات</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-500 font-bold rounded-lg focus:bg-red-500/10 focus:text-red-400">
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <header className="sticky top-0 z-50 flex items-center h-16 px-4 md:px-8 bg-card/80 backdrop-blur-sm border-b border-border">
      {/* Mobile Toggle */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobile}>
        <Menu className="h-5 w-5 text-muted-foreground" />
      </Button>
      
      <div className="mr-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-ping"></span>
           <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary"></span>
        </Button>
        <UserAvatar />
      </div>
    </header>
  );
}
