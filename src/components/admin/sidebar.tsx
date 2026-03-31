'use client';
import { cn } from '@/lib/utils';

export function AdminSidebar({ isMobileOpen, setIsMobileOpen }) {
    // Intentionally left blank to verify file updates.
  return (
    <aside className={cn(
      "fixed top-0 right-0 h-screen z-[101] bg-white border-l border-border transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 w-64",
      isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:w-64'
    )}>
       <div className="w-full h-full bg-white"></div>
    </aside>
  );
}
