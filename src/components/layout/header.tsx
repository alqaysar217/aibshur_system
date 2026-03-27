import { SidebarTrigger } from '@/components/ui/sidebar';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bell, LifeBuoy, Search } from 'lucide-react';
import Image from 'next/image';

const AbsherLogo = () => (
  <div className="flex items-center gap-2">
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4Z" fill="hsl(var(--primary))"/>
      <path d="M24 14C29.5228 14 34 18.4772 34 24C34 29.5228 29.5228 34 24 34C18.4772 34 14 29.5228 14 24C14 18.4772 18.4772 14 24 14Z" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 20V28" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 24H28" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <h1 className="text-xl font-bold tracking-tight text-primary font-headline">أبشر</h1>
  </div>
);

export default function AppHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <div className="hidden md:block">
          <AbsherLogo />
        </div>
      </div>

      <div className="md:hidden">
        <AbsherLogo />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Search className="w-5 h-5" />
          <span className="sr-only">بحث</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
          <span className="sr-only">الإشعارات</span>
        </Button>
         <Button variant="ghost" size="icon">
          <LifeBuoy className="w-5 h-5" />
          <span className="sr-only">الدعم</span>
        </Button>
      </div>
    </header>
  );
}
