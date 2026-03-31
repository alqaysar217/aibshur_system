'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { addDays, format, isWithinInterval } from "date-fns";
import { TrendingUp, ShoppingBag, PieChart, BadgePercent, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import type { Order, User } from '@/lib/types';
import { collection } from 'firebase/firestore';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Skeleton } from '@/components/ui/skeleton';

const KpiSkeleton = () => <Skeleton className="h-24 w-full" />;
const TableRowSkeleton = () => <TableRow><TableCell colSpan={5} className="p-0"><Skeleton className="h-12 w-full"/></TableCell></TableRow>;

export default function SalesReportPage() {
    const firestore = useFirestore();
    const [date, setDate] = useState<DateRange | undefined>({
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    });

    const ordersQuery = useMemo(() => firestore ? collection(firestore, 'orders') : null, [firestore]);
    const { data: orders, loading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery, 'orders');

    const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, loading: usersLoading, error: usersError } = useCollection<User>(usersQuery, 'users');

    const userMap = useMemo(() => new Map(users?.map(u => [u.uid, u.full_name])), [users]);

    const filteredOrders = useMemo(() => {
        if (!orders || !date?.from) return [];
        const toDate = date.to || date.from;
        return orders.filter(order => {
            const orderDate = new Date(order.created_at);
            return isWithinInterval(orderDate, { start: date.from!, end: toDate });
        });
    }, [orders, date]);
    
    const kpiData = useMemo(() => {
        const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');

        const totalSales = deliveredOrders.reduce((sum, order) => sum + order.total_price, 0);
        const completedOrdersCount = deliveredOrders.length;
        
        // Placeholder logic for profit. In a real scenario, this would be more complex.
        const netProfit = deliveredOrders.reduce((sum, order) => sum + (order.subtotal_price * 0.15), 0); // Assuming 15% profit margin
        
        return { totalSales, completedOrders: completedOrdersCount, netProfit, totalDiscounts: 0 }; // Discounts not implemented yet
    }, [filteredOrders]);
    
    const dbError = ordersError || usersError;
    if (dbError) {
      if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
          return <SetupFirestoreMessage />;
      }
      return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
    }
    if (!firestore) return <SetupFirestoreMessage />;
    
    const dataLoading = ordersLoading || usersLoading;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black text-gray-900">تقارير المبيعات</h1>
                <p className="text-gray-400 text-sm font-bold mt-1">تحليل مفصل للمبيعات والأداء المالي.</p>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dataLoading ? Array.from({length: 4}).map((_, i) => <KpiSkeleton key={i}/>) : <>
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign/>إجمالي المبيعات</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{kpiData.totalSales.toLocaleString()} ر.ي</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag/>الطلبات المكتملة</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{kpiData.completedOrders}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp/>صافي الربح (تقديري)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{kpiData.netProfit.toLocaleString()} ر.ي</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><BadgePercent/>إجمالي الخصومات</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{kpiData.totalDiscounts.toLocaleString()} ر.ي</p></CardContent></Card>
                </>}
            </div>
            
            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-wrap items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (<>{format(date.from, "dd/MM/yyyy")} - {format(date.to, "dd/MM/yyyy")}</>) : (format(date.from, "LLL dd, y"))
                            ) : (<span>اختر تاريخاً</span>)}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <CardDescription className="mr-auto text-xs font-bold">
                        يتم عرض {filteredOrders.length} طلب من أصل {orders?.length || 0}
                    </CardDescription>
                </CardContent>
            </Card>

            {/* Sales Table */}
            <Card>
                <CardHeader>
                    <CardTitle>سجل المبيعات ضمن النطاق الزمني المحدد</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                <TableHead>رقم الطلب</TableHead>
                                <TableHead>العميل</TableHead>
                                <TableHead>المبلغ</TableHead>
                                <TableHead>طريقة الدفع</TableHead>
                                <TableHead>التاريخ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {dataLoading ? Array.from({length: 5}).map((_, i) => <TableRowSkeleton key={i} />)
                           : filteredOrders.length > 0 ? filteredOrders.slice(0, 50).map(order => (
                               <TableRow key={order.orderId}>
                                   <TableCell className="font-mono">#{order.orderId.slice(-6)}</TableCell>
                                   <TableCell>{userMap.get(order.clientUid) || 'عميل غير معروف'}</TableCell>
                                   <TableCell>{order.total_price.toLocaleString()} ر.ي</TableCell>
                                   <TableCell>
                                        <span className={cn("px-2 py-1 rounded-full text-xs font-bold", order.payment_method === 'wallet' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')}>
                                            {order.payment_method === 'wallet' ? 'المحفظة' : 'عند الاستلام'}
                                        </span>
                                   </TableCell>
                                   <TableCell>{format(new Date(order.created_at), "yyyy/MM/dd")}</TableCell>
                               </TableRow>
                           )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-gray-400 font-bold">
                                    <p>لا توجد مبيعات في هذا النطاق الزمني.</p>
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
