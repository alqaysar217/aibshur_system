'use client';
import { ReactNode, useState } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopBar } from "@/components/admin/top-bar";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      
      <div className={cn(
        "h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out relative",
        "lg:mr-64",
        isCollapsed && "lg:mr-20"
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
