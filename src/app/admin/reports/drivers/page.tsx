'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Truck } from 'lucide-react';
import { mockUsers } from '@/lib/mock-data';

// Mock data for driver performance
const driverPerformanceData = mockUsers.filter(u => u.role === 'driver').map(driver => ({
  id: driver.uid,
  name: driver.full_name,
  deliveredOrders: Math.floor(Math.random() * 50) + 10,
  totalCommission: Math.floor(Math.random() * 50000) + 10000,
}));


export default function DriversAnalyticsPage() {
    const { toast } = useToast();
    const [drivers, setDrivers] = useState(driverPerformanceData);

    const handleSettleAccount = (driverId: string) => {
        setDrivers(prevDrivers => 
            prevDrivers.map(d => 
                d.id === driverId ? { ...d, totalCommission: 0 } : d
            )
        );
        toast({
            title: "تمت التسوية",
            description: `تم تصفير حساب المندوب بنجاح.`
        });
    }

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
                            {drivers.map((driver) => (
                                <TableRow key={driver.id}>
                                    <TableCell className="font-bold">{driver.name}</TableCell>
                                    <TableCell className="text-center font-mono font-bold">{driver.deliveredOrders}</TableCell>
                                    <TableCell className="text-center font-mono font-bold text-green-600">{driver.totalCommission.toLocaleString()} ر.ي</TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSettleAccount(driver.id)}
                                            disabled={driver.totalCommission === 0}
                                        >
                                            تسوية الحساب
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {drivers.length === 0 && (
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
