'use client';
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Truck, Loader2 } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { User, Order } from '@/lib/types';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Skeleton } from '@/components/ui/skeleton';

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

    const driversQuery = useMemo(() => firestore ? query(collection(firestore, 'users'), where('role', '==', 'driver')) : null, [firestore]);
    const { data: drivers, loading: driversLoading, error: driversError } = useCollection<User>(driversQuery, 'users');

    const ordersQuery = useMemo(() => firestore ? collection(firestore, 'orders') : null, [firestore]);
    const { data: orders, loading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery, 'orders');

    const driverPerformanceData = useMemo(() => {
        if (!drivers || !orders) return [];

        return drivers.map(driver => {
            const deliveredOrders = orders.filter(order => order.driverUid === driver.uid && order.status === 'delivered');
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
        // In a real app, you would create a financial log entry and then update the driver's balance.
        // For now, we will just show a success message as if it worked.
        // To make it more realistic, I'll simulate a delay.
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Let's find the driver to update their wallet in the UI state if needed,
        // though re-fetching from Firestore is the source of truth.
        // The business logic for commission is not fully defined (where is it stored?),
        // so for now we'll just show the toast and let the data re-render if it were to change.
        
        toast({
            title: "تمت التسوية",
            description: `تم تصفير حساب المندوب بنجاح (محاكاة).`
        });

        // In a real implementation, you would update the driver's document, e.g.:
        // const driverRef = doc(firestore, 'users', driverId);
        // await updateDoc(driverRef, { 'driver_details.commission_balance': 0 });
        
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
                        تعتمد العمولة المستحقة على مجموع رسوم التوصيل للطلبات المكتملة.
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
                            {driversLoading || ordersLoading ? (
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
                                    <TableCell colSpan={4} className="h-24 text-center">لا يوجد مناديب لعرضهم.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    )
}
