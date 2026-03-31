'use client';
import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { User } from '@/lib/types';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={5} className="p-0">
            <Skeleton className="w-full h-14"/>
        </TableCell>
    </TableRow>
);

export default function AdminDriversPage() {
    const firestore = useFirestore();

    const driversQuery = useMemo(() => firestore ? query(collection(firestore, 'users'), where('roles.is_driver', '==', true)) : null, [firestore]);
    const { data: drivers, loading: driversLoading, error: driversError } = useCollection<User>(driversQuery, 'users');

    if (driversError) {
      if (driversError.message.includes('database (default) does not exist') || driversError.message.includes('permission-denied')) {
          return <SetupFirestoreMessage />;
      }
      return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {driversError.message}</p>;
    }
    if (!firestore) return <SetupFirestoreMessage />;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black text-gray-900">إدارة المناديب</h1>
                <p className="text-gray-400 text-sm font-bold mt-1">عرض وتعديل بيانات مناديب التوصيل.</p>
            </div>
             <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="text-primary"/>
                        قائمة المناديب المسجلين
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                <TableHead>اسم المندوب</TableHead>
                                <TableHead className="text-center">رقم الهاتف</TableHead>
                                <TableHead className="text-center">حالة القبول</TableHead>
                                <TableHead className="text-center">حالة الحساب</TableHead>
                                <TableHead className="text-center">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {driversLoading ? (
                                Array.from({length: 4}).map((_, i) => <RowSkeleton key={i} />)
                            ) : drivers && drivers.length > 0 ? (
                                drivers.map((driver) => (
                                <TableRow key={driver.uid}>
                                    <TableCell className="font-bold">{driver.full_name}</TableCell>
                                    <TableCell className="text-center font-mono">{driver.phone}</TableCell>
                                    <TableCell className="text-center">
                                         <Badge className={cn(driver.driver_details?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>{driver.driver_details?.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}</Badge>
                                    </TableCell>
                                     <TableCell className="text-center">
                                        <Badge variant={driver.account_status.is_blocked ? 'destructive' : 'secondary'}>{driver.account_status.is_blocked ? 'محظور' : 'نشط'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button size="sm">
                                            عرض التفاصيل
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-gray-400 font-bold">
                                        <p>لا يوجد مناديب لعرضهم.</p>
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
