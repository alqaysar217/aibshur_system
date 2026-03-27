import { SidebarProvider } from '@/components/ui/sidebar';
import type { User } from '@/lib/types';
import AppSidebar from './sidebar';
import AppHeader from './header';
import { mockUsers } from '@/lib/mock-data';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // In a real app, you'd get the current user from an auth session.
  // We'll simulate this by allowing you to switch the user index in `src/app/page.tsx`.
  const currentUser: User = mockUsers[0]; // 0: client, 1: driver, 2: admin

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
