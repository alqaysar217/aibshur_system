'use client';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './sidebar';
import AppHeader from './header';
import { mockAdminUser } from '@/lib/mock-data'; // Using mock user

// NOTE: All authentication logic has been temporarily bypassed for development purposes.
// The app will always render as if an admin user is logged in.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = mockAdminUser;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={currentUser} />
        <div className="flex flex-col flex-1 w-0">
          <AppHeader user={currentUser} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 mx-auto max-w-7xl sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
