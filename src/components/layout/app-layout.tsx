'use client';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './sidebar';
import AppHeader from './header';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

const FullPageLoader = () => (
    <div className="flex flex-col min-h-screen bg-background p-4">
        <header className="flex items-center justify-between h-16 px-4 border-b">
            <Skeleton className="w-32 h-8" />
            <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
            </div>
        </header>
        <div className="flex flex-1">
            <div className="hidden w-64 p-4 space-y-4 border-l md:block">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className='space-y-2'>
                        <Skeleton className="w-24 h-4" />
                        <Skeleton className="w-16 h-4" />
                    </div>
                </div>
                <div className='space-y-2'>
                    {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="w-full h-10" />)}
                </div>
            </div>
            <main className="flex-1 p-8 space-y-8">
                 <Skeleton className="w-1/3 h-8" />
                 <Skeleton className="w-1/2 h-4" />
                 <div className="grid gap-4 md:grid-cols-4">
                    <Skeleton className="w-full h-24" />
                    <Skeleton className="w-full h-24" />
                    <Skeleton className="w-full h-24" />
                    <Skeleton className="w-full h-24" />
                 </div>
                 <Skeleton className="w-full h-64" />
            </main>
        </div>
    </div>
);


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, userData } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ['/login', '/register'];

  useEffect(() => {
    if (loading) return;

    if (!user && !publicRoutes.includes(pathname)) {
      router.push('/login');
    } else if (user && publicRoutes.includes(pathname)) {
      router.push('/');
    } else if (user && userData && !userData.city_id && userData.role !== 'admin' && pathname !== '/select-city') {
      router.push('/select-city');
    }
  }, [user, loading, userData, router, pathname]);

  if (loading && !publicRoutes.includes(pathname)) {
    return <FullPageLoader />;
  }

  if (!user && !publicRoutes.includes(pathname)) {
     return <FullPageLoader />;
  }
  
  if (user && !userData && !publicRoutes.includes(pathname)) {
    // If we have a user but no firestore data yet (still loading), show loader
    // unless it's a new user on the register page.
    if(pathname !== '/register') {
      return <FullPageLoader />;
    }
  }

  if (publicRoutes.includes(pathname) || (user && !userData && pathname === '/register') || (user && userData && !userData.city_id && pathname === '/select-city')) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <main className="w-full max-w-md p-4">
              {children}
            </main>
        </div>
    );
  }

  if (!userData) {
      // This can happen briefly if the user is logged in but their data is not yet available,
      // or if they're on a public route.
      return <FullPageLoader />;
  }


  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={userData} />
        <div className="flex flex-col flex-1 w-0">
          <AppHeader user={userData} />
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
