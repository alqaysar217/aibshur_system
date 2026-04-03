'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, parseISO, startOfDay, subDays } from "date-fns";
import { TrendingUp, ShoppingBag, XCircle, DollarSign, FileDown, Printer, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import type { Order, User, Store, City, OrderStatus, PaymentMethod } from '@/lib/types';
import { collection, getDocs } from 'firebase/firestore';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Skeleton } from '@/components/ui/skeleton';
import KpiCard from '@/components/admin/reports/kpi-card';
import { DateRangePickerWithPresets } from '@/components/admin/reports/date-range-picker-with-presets';
import EmptyState from '@/components/admin/reports/empty-state';
import { exportToExcel, exportToPdf } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

const KpiSkeleton = () => <Skeleton className="h-32 w-full rounded-3xl bg-white/10" />;
const ChartSkeleton = () => <Skeleton className="h-80 w-full rounded-3xl bg-white/10" />;
const TableRowSkeleton = () => <TableRow><TableCell colSpan={6} className="p-2"><Skeleton className="h-12 w-full bg-white/10"/></TableCell></TableRow>;

const statusMap: { [key in OrderStatus]?: string } = {
  pending: "قيد الانتظار",
  preparing: "قيد التجهيز",
  out_for_delivery: "جاري التوصيل",
  delivered: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
  accepted: "مقبول"
};

const paymentMethodMap: { [key in PaymentMethod]: string } = {
  cash: "عند الاستلام",
  wallet: "المحفظة",
  card: "بطاقة"
};

export default function SalesReportPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Data state
    const [orders, setOrders] = useState<Order[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Loading and error state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Filter state
    const [date, setDate] = useState<DateRange | undefined>({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
    const [storeFilter, setStoreFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');

    const fetchData = useCallback(async () => {
        if (!firestore) return;
        setLoading(true);
        setError(null);
        try {
            const [ordersSnapshot, storesSnapshot, citiesSnapshot, usersSnapshot] = await Promise.all([
                getDocs(collection(firestore, 'orders')),
                getDocs(collection(firestore, 'stores')),
                getDocs(collection(firestore, 'cities')),
                getDocs(collection(firestore, 'users')),
            ]);
            setOrders(ordersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
            setStores(storesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Store)));
            setCities(citiesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as City)));
            setUsers(usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
        } catch (e: any) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, [firestore]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { userMap, storeMap, cityMap } = useMemo(() => {
        const userMap = new Map(users.map(u => [u.uid, u.full_name]));
        const storeMap = new Map(stores.map(s => [s.id, s]));
        const cityMap = new Map(cities.map(c => [c.id, c.name_ar]));
        return { userMap, storeMap, cityMap };
    }, [users, stores, cities]);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        return orders.filter(order => {
            const orderDate = parseISO(order.created_at);
            const isInDateRange = date?.from && isWithinInterval(orderDate, { start: startOfDay(date.from), end: date.to || date.from });
            const store = storeMap.get(order.storeId);
            
            const storeMatch = storeFilter === 'all' || order.storeId === storeFilter;
            const statusMatch = statusFilter === 'all' || order.status === statusFilter;
            const cityMatch = cityFilter === 'all' || store?.city_id === cityFilter;
            const paymentMatch = paymentFilter === 'all' || order.payment_method === paymentFilter;

            return isInDateRange && storeMatch && statusMatch && cityMatch && paymentMatch;
        });
    }, [orders, date, storeFilter, statusFilter, cityFilter, paymentFilter, storeMap]);
    
    const kpiData = useMemo(() => {
        const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
        const totalSales = deliveredOrders.reduce((sum, order) => sum + order.total_price, 0);
        const netProfit = deliveredOrders.reduce((sum, order) => {
            const store = storeMap.get(order.storeId);
            const feePercentage = store?.platform_fee_percentage || 10;
            return sum + (order.subtotal_price * (feePercentage / 100));
        }, 0);
        const completedOrdersCount = deliveredOrders.length;
        const cancelledOrdersCount = filteredOrders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length;
        
        return { totalSales, netProfit, completedOrdersCount, cancelledOrdersCount };
    }, [filteredOrders, storeMap]);

    const chartData = useMemo(() => {
        if (!date?.from) return [];
        const dailySales: { [key: string]: number } = {};
        const daysInRange = [];
        let currentDate = date.from;
        while(currentDate <= (date.to || date.from)) {
            const formattedDate = format(currentDate, 'yyyy-MM-dd');
            daysInRange.push(formattedDate);
            dailySales[formattedDate] = 0;
            currentDate = addDays(currentDate, 1);
        }
        filteredOrders.forEach(order => {
            if (order.status === 'delivered') {
                const day = format(parseISO(order.created_at), 'yyyy-MM-dd');
                if (dailySales[day] !== undefined) {
                    dailySales[day] += order.total_price;
                }
            }
        });
        return daysInRange.map(day => ({ name: format(parseISO(day), 'dd/MM'), sales: dailySales[day] }));
    }, [filteredOrders, date]);
    
    const handleExportExcel = () => {
        if(filteredOrders.length === 0) {
            toast({ variant: "destructive", title: "لا توجد بيانات للتصدير"});
            return;
        }
        const dataToExport = filteredOrders.map(o => ({
            "رقم الطلب": o.id,
            "العميل": userMap.get(o.clientUid) || 'N/A',
            "المتجر": storeMap.get(o.storeId)?.name_ar || 'N/A',
            "المدينة": cityMap.get(storeMap.get(o.storeId)?.city_id || '') || 'N/A',
            "الإجمالي": o.total_price,
            "الحالة": statusMap[o.status] || o.status,
            "طريقة الدفع": paymentMethodMap[o.payment_method],
            "التاريخ": format(parseISO(o.created_at), 'yyyy-MM-dd HH:mm'),
        }));
        exportToExcel(dataToExport, "Sales_Report", "Sales");
    }

    const handleExportPdf = () => {
        if(filteredOrders.length === 0) {
            toast({ variant: "destructive", title: "لا توجد بيانات للطباعة"});
            return;
        }
        const headers = ["التاريخ", "طريقة الدفع", "الحالة", "الإجمالي", "المتجر", "العميل", "رقم الطلب"];
        const body = filteredOrders.map(o => [
            format(parseISO(o.created_at), 'yy/MM/dd'),
            paymentMethodMap[o.payment_method],
            statusMap[o.status] || o.status,
            o.total_price.toLocaleString(),
            storeMap.get(o.storeId)?.name_ar || 'N/A',
            userMap.get(o.clientUid) || 'N/A',
            o.id?.slice(-6),
        ]);
         const kpis = [
            { label: 'Total Sales', value: kpiData.totalSales.toLocaleString() + ' YER' },
            { label: 'Net Profit', value: kpiData.netProfit.toLocaleString() + ' YER' },
            { label: 'Completed Orders', value: String(kpiData.completedOrdersCount) },
        ];
        const dateRangeStr = date?.from && date?.to ? `${format(date.from, 'yyyy/MM/dd')} - ${format(date.to, 'yyyy/MM/dd')}` : 'N/A';
        exportToPdf('Sales Report', headers.reverse(), body.map(row => row.reverse()), kpis, dateRangeStr);
    }
    
    if (error) return <SetupFirestoreMessage />;
    if (!firestore) return <SetupFirestoreMessage />;
    
    return (
        <div className="space-y-8 text-white" dir="rtl">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">تحليلات المبيعات</h1>
                    <p className="text-gray-400 text-sm font-bold mt-1">نظرة شاملة ومباشرة على أداء المنصة المالي.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportExcel} variant="outline" className="bg-transparent border-green-500 text-green-400 hover:bg-green-500/10 hover:text-green-300"><FileDown className="ml-2 h-4 w-4"/>تصدير Excel</Button>
                    <Button onClick={handleExportPdf} variant="outline" className="bg-transparent border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300"><Printer className="ml-2 h-4 w-4"/>طباعة التقرير</Button>
                    <Button onClick={fetchData} variant="ghost" size="icon" disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && 'animate-spin')}/></Button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? Array.from({length: 4}).map((_, i) => <KpiSkeleton key={i}/>) : <>
                    <KpiCard title="إجمالي المبيعات" value={`${kpiData.totalSales.toLocaleString()} ر.ي`} description="فقط من الطلبات المكتملة" Icon={DollarSign} iconColorClass="text-green-400" />
                    <KpiCard title="صافي الربح" value={`${kpiData.netProfit.toLocaleString()} ر.ي`} description="أرباح المنصة من العمولة" Icon={TrendingUp} iconColorClass="text-purple-400" />
                    <KpiCard title="الطلبات المكتملة" value={String(kpiData.completedOrdersCount)} description="الطلبات التي تم توصيلها بنجاح" Icon={ShoppingBag} iconColorClass="text-sky-400" />
                    <KpiCard title="الطلبات الملغاة" value={String(kpiData.cancelledOrdersCount)} description="الطلبات التي تم إلغاؤها أو رفضها" Icon={XCircle} iconColorClass="text-red-400" />
                </>}
            </div>
            
            <Card className="bg-white/5 border-white/20 backdrop-blur-sm rounded-3xl shadow-lg p-4">
                 <div className="flex flex-wrap items-center gap-3">
                    <DateRangePickerWithPresets date={date} setDate={setDate} />
                    <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="فلترة بالمتجر" /></SelectTrigger><SelectContent><SelectItem value="all">كل المتاجر</SelectItem>{stores.map(s => <SelectItem key={s.id} value={s.id!}>{s.name_ar}</SelectItem>)}</SelectContent></Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="فلترة بالحالة" /></SelectTrigger><SelectContent>{Object.entries(statusMap).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}<SelectItem value="all">كل الحالات</SelectItem></SelectContent></Select>
                    <Select value={cityFilter} onValueChange={setCityFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="فلترة بالمدينة" /></SelectTrigger><SelectContent><SelectItem value="all">كل المدن</SelectItem>{cities.map(c => <SelectItem key={c.id} value={c.id!}>{c.name_ar}</SelectItem>)}</SelectContent></Select>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="طريقة الدفع" /></SelectTrigger><SelectContent><SelectItem value="all">الكل</SelectItem>{Object.entries(paymentMethodMap).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select>
                 </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3 bg-white/5 border-white/20 backdrop-blur-sm rounded-3xl shadow-lg">
                    <CardHeader><CardTitle className="text-white">منحنى المبيعات اليومي</CardTitle></CardHeader>
                    <CardContent className="h-80 pr-6">
                        {loading ? <ChartSkeleton/> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1FAF9A" stopOpacity={0.6}/><stop offset="95%" stopColor="#1FAF9A" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false}/>
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000)}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(10,20,30,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '1rem', color: 'white' }} />
                                    <Area type="monotone" dataKey="sales" stroke="#1FAF9A" strokeWidth={2} fillOpacity={1} fill="url(#salesGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2 bg-white/5 border-white/20 backdrop-blur-sm rounded-3xl shadow-lg">
                    <CardHeader><CardTitle className="text-white">أحدث الطلبات</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />) :
                         filteredOrders.slice(0, 5).map(order => (
                             <div key={order.id} className="flex items-center justify-between text-sm">
                                 <div>
                                     <p className="font-bold">{userMap.get(order.clientUid) || 'عميل غير معروف'}</p>
                                     <p className="text-xs text-gray-400">{storeMap.get(order.storeId)?.name_ar}</p>
                                 </div>
                                 <div className="text-left">
                                      <p className="font-bold font-mono">{order.total_price.toLocaleString()} ر.ي</p>
                                      <p className="text-xs text-gray-400">{format(parseISO(order.created_at), 'hh:mm a')}</p>
                                 </div>
                             </div>
                         ))
                        }
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white/5 border border-white/20 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden">
                <div className="p-4"><h3 className="font-bold text-white">سجل العمليات المفصل</h3></div>
                <div className="overflow-auto max-h-[500px]">
                <Table>
                    <TableHeader className="sticky top-0 bg-black/30 backdrop-blur-xl z-10">
                        <TableRow className="border-white/20 hover:bg-transparent">
                            <TableHead className="text-right text-white">الطلب</TableHead>
                            <TableHead className="text-center text-white">المتجر</TableHead>
                            <TableHead className="text-center text-white">الإجمالي</TableHead>
                            <TableHead className="text-center text-white">الحالة</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? Array.from({length: 7}).map((_, i) => <TableRowSkeleton key={i} />)
                         : filteredOrders.length > 0 ? filteredOrders.map(order => (
                            <TableRow key={order.id} className="border-white/10">
                                <TableCell>
                                    <div className="font-bold">{userMap.get(order.clientUid) || 'N/A'}</div>
                                    <div className="text-xs text-gray-400 font-mono">{format(parseISO(order.created_at), 'dd/MM/yy hh:mm a')}</div>
                                </TableCell>
                                <TableCell className="text-center text-gray-300">{storeMap.get(order.storeId)?.name_ar}</TableCell>
                                <TableCell className="text-center font-bold font-mono">{order.total_price.toLocaleString()} ر.ي</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className={cn('h-2.5 w-2.5 rounded-full', {
                                            'bg-green-400 animate-pulse': order.status === 'delivered',
                                            'bg-yellow-400': order.status === 'pending' || order.status === 'preparing',
                                            'bg-sky-400': order.status === 'out_for_delivery',
                                            'bg-red-500': order.status === 'cancelled' || order.status === 'rejected',
                                        })}></span>
                                        <span>{statusMap[order.status] || order.status}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                         )) : (
                           <TableRow className="border-none"><TableCell colSpan={6}><EmptyState /></TableCell></TableRow>
                         )}
                    </TableBody>
                </Table>
                </div>
            </div>
        </div>
    );
}
