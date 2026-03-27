'use client';

import { Menu, Bell, ChevronDown, PanelLeft } from 'lucide-react';
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
import { mockAdminUser } from '@/lib/mock-data'; // Using mock user

interface AdminTopBarProps {
  toggleMobile: () => void;
  toggleDesktop: () => void;
}

export function AdminTopBar({ toggleMobile, toggleDesktop }: AdminTopBarProps) {
  const user = mockAdminUser;

  return (
    <header className="sticky top-0 z-50 flex items-center h-16 px-4 md:px-8 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      {/* Desktop Toggle */}
      <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={toggleDesktop}>
        <PanelLeft className="h-5 w-5 text-gray-500" />
      </Button>
      {/* Mobile Toggle */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobile}>
        <Menu className="h-5 w-5 text-gray-500" />
      </Button>
      
      <div className="mr-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.profile_image} alt={user.full_name} />
                <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-black text-gray-800">{user.full_name}</span>
                <span className="text-[10px] font-bold text-gray-400">{user.role}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 hidden md:flex" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl shadow-lg w-56">
            <DropdownMenuLabel className='font-bold'>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="font-bold rounded-lg">الملف الشخصي</DropdownMenuItem>
            <DropdownMenuItem className="font-bold rounded-lg">الإعدادات</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500 font-bold rounded-lg">تسجيل الخروج</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
