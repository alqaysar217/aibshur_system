'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, ShoppingBag, Activity } from 'lucide-react';
import type { User, Order } from '@/lib/types';
import StatsCard from './stats-card';
import SalesChart from './sales-chart';
import { useCollection } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Skeleton } from '../ui/skeleton';

const StatsSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="w-24 h-5"/></CardHeader><CardContent><Skeleton className="w-32 h-8"/><Skeleton className="w-40 h-4 mt-1"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="w-24 h-5"/></CardHeader><CardContent><Skeleton className="w-32 h-8"/><Skeleton className="w-40 h-4 mt-1"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="w-24 h-5"/></CardHeader><CardContent><Skeleton className="w-32 h-8"/><Skeleton className="w-40 h-4 mt-1"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="w-24 h-5"/></CardHeader><CardContent><Skeleton className="w-32 h-8"/><Skeleton className="w-40 h-4 mt-1"/></CardContent></Card>
    </div>
);

const RecentActivitySkeleton = () => (
    <Card>
        <CardHeader>
            <CardTitle>آخر النشاطات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {Array.from({length: 3}).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full"/>
                    <div className='space-y-2'>
                        <Skeleton className="h-4 w-48"/>
                        <Skeleton className="h-3 w-24"/>
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
);


export default function AdminDashboard({ user }: { user: User }) {
  const firestore = useFirestore();

  const { data: orders, loading: ordersLoading } = useCollection<Order>(firestore ? collection(firestore, 'orders') : null);
  const { data: users, loading: usersLoading } = useCollection<User>(firestore ? collection(firestore, 'users') : null);
  const { data: stores, loading: storesLoading } = useCollection(firestore ? collection(firestore, 'stores') : null);
  
  const { data: recentUsers, loading: recentUsersLoading } = useCollection<User>(
    firestore ? query(collection(firestore, 'users'), orderBy('created_at', 'desc'), limit(3)) : null
  );

  const totalRevenue = orders?.reduce((sum, order) => sum + order.total_price, 0) ?? 0;
  const totalUsers = users?.length ?? 0;
  const totalStores = stores?.length ?? 0;
  const totalOrders = orders?.length ?? 0;

  const loading = ordersLoading || usersLoading || storesLoading;

  return (
    <div className="grid gap-8">
      <div className="text-right">
        <h1 className="text-3xl font-bold">لوحة تحكم المدير</h1>
        <p className="text-muted-foreground">نظرة عامة على نظام أبشر.</p>
      </div>
      {loading ? <StatsSkeleton /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
            title="إجمالي الإيرادات"
            value={`${totalRevenue.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}`}
            description="جميع الأوقات"
            Icon={DollarSign}
            />
            <StatsCard
            title="المستخدمون"
            value={`+${totalUsers}`}
            description="إجمالي المستخدمين المسجلين"
            Icon={Users}
            />
            <StatsCard
            title="المتاجر"
            value={`+${totalStores}`}
            description="إجمالي المتاجر النشطة"
            Icon={ShoppingBag}
            />
            <StatsCard
            title="الطلبات"
            value={`+${totalOrders}`}
            description="جميع الأوقات"
            Icon={Activity}
            />
        </div>
      )}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesChart />
        </div>
        {recentUsersLoading ? <RecentActivitySkeleton /> : (
            <Card>
            <CardHeader>
                <CardTitle>آخر المستخدمين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {recentUsers?.map((activityUser, index) => (
                <div key={index} className="flex items-center gap-4">
                    <Avatar>
                    <AvatarImage src={activityUser.profile_image} />
                    <AvatarFallback>{activityUser.full_name ? activityUser.full_name.charAt(0) : 'A'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                    <p className="text-sm font-medium leading-none">
                        <span className="font-bold">{activityUser.full_name}</span> انضم مؤخرا
                    </p>
                    <p className="text-sm text-muted-foreground">{new Date(activityUser.created_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                </div>
                ))}
                {recentUsers?.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">لا يوجد نشاط لعرضه.</p>
                )}
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
