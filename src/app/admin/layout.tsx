'use client';
import { ReactNode, useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopBar } from "@/components/admin/top-bar";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkSize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  if (!mounted) {
    return (
        <div className="flex h-screen w-full bg-background items-center justify-center">
            {/* You can add a full-page loader here */}
        </div>
    );
  }

  // The main layout is no longer a flex container.
  // The sidebar is fixed, and the main content has a margin to avoid overlap.
  return (
    <div className="h-screen w-full bg-background font-body overflow-hidden" dir="rtl">
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] lg:hidden backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <AdminSidebar 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
      />
      
      {/* Main content with dynamic margin-right. `relative` is needed for some children positioning */}
      <div className={cn(
        "h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out relative",
        "lg:mr-64", // Default margin for expanded sidebar
        isCollapsed && "lg:mr-20" // Margin for collapsed sidebar
      )}>
        <AdminTopBar 
          toggleMobile={() => setIsMobileOpen(!isMobileOpen)} 
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isCollapsed={isCollapsed}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
