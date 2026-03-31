'use client';
import { ReactNode, useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopBar } from "@/components/admin/top-bar";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // New state for desktop collapse
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
        <div className="flex h-screen w-full bg-background items-center justify-center">
        </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background font-body overflow-hidden" dir="rtl">
      {/* Sidebar Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] lg:hidden backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AdminTopBar 
          toggleMobile={() => setIsMobileOpen(!isMobileOpen)} 
          toggleCollapse={() => setIsCollapsed(!isCollapsed)} // Pass the toggle function
          isCollapsed={isCollapsed} // Pass state for icon change
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-[#F5F7F6]">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
