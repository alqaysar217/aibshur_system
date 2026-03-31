'use client';
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Truck, Loader2, Database } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { User, Order } from '@/lib/types';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={4} className="p-0">
            <Skeleton className="w-full h-14"/>
        </TableCell>
    </TableRow>
);


export default function DriversAnalyticsPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [settlingId, setSettlingId] = useState<string | null>(null);

    const driversQuery = useMemo(() => firestore ? query(collection(firestore, 'users'), where('roles.is_driver', '==', true)) : null, [firestore]);
    const { data: drivers, loading: driversLoading, error: driversError } = useCollection<User>(driversQuery, 'users');

    const ordersQuery = useMemo(() => firestore ? query(collection(firestore, 'orders'), where('status', '==', 'delivered')) : null, [firestore]);
    const { data: orders, loading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery, 'orders');

    const driverPerformanceData = useMemo(() => {
        if (!drivers) return [];

        return drivers.map(driver => {
            const deliveredOrders = orders?.filter(order => order.driverUid === driver.uid) || [];
            const totalCommission = deliveredOrders.reduce((acc, order) => acc + order.delivery_fee, 0);

            return {
                id: driver.uid,
                name: driver.full_name,
                deliveredOrders: deliveredOrders.length,
                totalCommission: totalCommission,
            };
        });
    }, [drivers, orders]);

    const handleSettleAccount = async (driverId: string) => {
        if (!firestore) return;
        setSettlingId(driverId);
        
        // This is a placeholder for a real financial transaction.
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({
            title: "تمت التسوية",
            description: `تم تصفير حساب المندوب بنجاح (محاكاة).`
        });
        
        setSettlingId(null);
    }
    
    const dbError = driversError || ordersError;
    if (dbError) {
      if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
          return <SetupFirestoreMessage />;
      }
      return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
    }
    if (!firestore) return <SetupFirestoreMessage />;

    const isDataReady = !driversLoading && !ordersLoading;


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black text-gray-900">تقرير أداء المناديب</h1>
                <p className="text-gray-400 text-sm font-bold mt-1">تحليل أداء المناديب وإدارة مستحقاتهم المالية.</p>
            </div>

             <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="text-primary"/>
                        كشف حساب المناديب
                    </CardTitle>
                    <CardDescription>
                        تعتمد العمولة المستحقة على مجموع رسوم التوصيل للطلبات المكتملة فقط.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                <TableHead>اسم المندوب</TableHead>
                                <TableHead className="text-center">الطلبات المكتملة</TableHead>
                                <TableHead className="text-center">العمولة المستحقة</TableHead>
                                <TableHead className="text-center">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!isDataReady ? (
                                Array.from({length: 3}).map((_, i) => <RowSkeleton key={i} />)
                            ) : driverPerformanceData.length > 0 ? (
                                driverPerformanceData.map((driver) => (
                                <TableRow key={driver.id}>
                                    <TableCell className="font-bold">{driver.name}</TableCell>
                                    <TableCell className="text-center font-mono font-bold">{driver.deliveredOrders}</TableCell>
                                    <TableCell className="text-center font-mono font-bold text-green-600">{driver.totalCommission.toLocaleString()} ر.ي</TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSettleAccount(driver.id)}
                                            disabled={driver.totalCommission === 0 || settlingId === driver.id}
                                        >
                                            {settlingId === driver.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'تسوية الحساب'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Truck className="w-16 h-16 text-gray-300" />
                                            <h3 className="text-xl font-bold text-gray-600">لا يوجد مناديب لعرضهم</h3>
                                            <p className="text-gray-400 font-bold max-w-md">
                                                لا يوجد مستخدمون لديهم صلاحية "مندوب" في النظام حالياً، أو لم يتم حقن البيانات بعد.
                                            </p>
                                            <Button asChild className="font-black gap-2 mt-2">
                                                <Link href="/admin/reports/data-seeder">
                                                    <Database className="h-4 w-4" />
                                                    الذهاب إلى أداة حقن البيانات
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    )
}
