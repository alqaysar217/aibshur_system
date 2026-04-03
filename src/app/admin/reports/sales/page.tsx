'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { format, isWithinInterval, parseISO, startOfDay, subDays, addDays, endOfDay, startOfMonth } from "date-fns";
import { TrendingUp, ShoppingBag, XCircle, DollarSign, FileDown, RefreshCw, Printer, FileSearch } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import type { Order, User, Store, City, OrderStatus, PaymentMethod } from '@/lib/types';
import { collection, getDocs } from 'firebase/firestore';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePickerWithPresets } from '@/components/admin/reports/date-range-picker-with-presets';
import { exportToExcel, exportToPdf } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

const KpiSkeleton = () => <Skeleton className="h-32 w-full rounded-lg" />;
const ChartSkeleton = () => <Skeleton className="h-80 w-full rounded-lg" />;
const TableRowSkeleton = () => <TableRow><TableCell colSpan={6} className="p-2"><Skeleton className="h-12 w-full"/></TableCell></TableRow>;

const statusMap: { [key in OrderStatus]?: string } = {
  pending: "قيد الانتظار",
  preparing: "قيد التجهيز",
  out_for_delivery: "جاري التوصيل",
  delivered: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
  accepted: "مقبول"
};

const statusColors: { [key in OrderStatus]?: string } = {
    delivered: 'hsl(var(--primary))',
    pending: '#A0AEC0',        // gray-400
    preparing: '#F59E0B',     // amber-500
    out_for_delivery: '#3B82F6',// blue-500
    cancelled: 'hsl(var(--destructive))',
    rejected: 'hsl(var(--destructive))',
    accepted: '#6366F1', // indigo-500
};

const paymentMethodMap: { [key in PaymentMethod]: string } = {
  cash: "عند الاستلام",
  wallet: "المحفظة",
  card: "بطاقة"
};

const KpiCard = ({ title, value, description, Icon, iconColorClass, isLoading }: { title:string, value:string, description:string, Icon: any, iconColorClass:string, isLoading: boolean }) => {
    if (isLoading) return <KpiSkeleton />;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-bold text-muted-foreground">{title}</CardTitle>
          <Icon className={cn('w-5 h-5', iconColorClass)} />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    );
};

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-gray-50 rounded-lg">
      <FileSearch className="w-16 h-16 text-gray-300" />
      <h3 className="mt-4 text-xl font-bold text-gray-700">لا توجد بيانات</h3>
      <p className="mt-1 text-sm text-gray-500">
        لم يتم العثور على أي بيانات تطابق الفلاتر الحالية.
        <br />
        حاول تغيير النطاق الزمني أو معايير الفلترة.
      </p>
    </div>
  );


export default function SalesReportPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

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
            setUsers(usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
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
            const isInDateRange = date?.from && date?.to ? isWithinInterval(orderDate, { start: startOfDay(date.from), end: endOfDay(date.to) }) : true;
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
            const feePercentage = 10; // Assuming a 10% fee for now
            return sum + (order.subtotal_price * (feePercentage / 100));
        }, 0);
        const completedOrdersCount = deliveredOrders.length;
        const cancelledOrdersCount = filteredOrders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length;
        
        return { totalSales, netProfit, completedOrdersCount, cancelledOrdersCount };
    }, [filteredOrders]);

    const chartData = useMemo(() => {
        if (!date?.from || !date.to) return [];
        const dailySales: { [key: string]: number } = {};
        let currentDate = new Date(date.from);
        
        while(currentDate <= date.to) {
            const formattedDate = format(currentDate, 'yyyy-MM-dd');
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
        return Object.entries(dailySales).map(([day, sales]) => ({ name: format(parseISO(day), 'dd/MM'), sales: sales }));
    }, [filteredOrders, date]);

    const statusChartData = useMemo(() => {
        const statusCounts = filteredOrders.reduce((acc, order) => {
            const status = order.status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
    
        return Object.entries(statusCounts)
            .map(([name, value]) => ({
                name: statusLabels[name] || name,
                value,
                color: statusColors[name] || '#cccccc'
            }))
            .sort((a, b) => b.value - a.value);

    }, [filteredOrders]);

     const storePerformanceData = useMemo(() => {
        const storeAggregates = filteredOrders.reduce((acc, order) => {
            if (order.status !== 'delivered') return acc;
            const storeName = storeMap.get(order.storeId)?.name_ar || "متجر غير معروف";
            acc[storeName] = (acc[storeName] || 0) + order.total_price;
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(storeAggregates)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);
    }, [filteredOrders, storeMap]);
    
    
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
        if (filteredOrders.length === 0) {
            toast({ variant: "destructive", title: "لا توجد بيانات للتصدير" });
            return;
        }
        const title = `تقرير المبيعات من ${format(date?.from || new Date(), 'yyyy-MM-dd')} إلى ${format(date?.to || new Date(), 'yyyy-MM-dd')}`;
        const headers = ["التاريخ", "طريقة الدفع", "الحالة", "الإجمالي", "المدينة", "المتجر", "العميل", "رقم الطلب"];
        const body = filteredOrders.map(o => ([
            format(parseISO(o.created_at), 'yy-MM-dd HH:mm'),
            paymentMethodMap[o.payment_method],
            statusMap[o.status] || o.status,
            o.total_price.toLocaleString(),
            cityMap.get(storeMap.get(o.storeId)?.city_id || '') || 'N/A',
            storeMap.get(o.storeId)?.name_ar || 'N/A',
            userMap.get(o.clientUid) || 'N/A',
            o.id?.slice(-6) || 'N/A',
        ]));
        
        const summary = [
            { title: "إجمالي المبيعات", value: kpiData.totalSales.toLocaleString() + ' ر.ي' },
            { title: "صافي الربح (تقديري)", value: kpiData.netProfit.toLocaleString() + ' ر.ي' },
            { title: "الطلبات المكتملة", value: kpiData.completedOrdersCount.toString() },
            { title: "الطلبات الملغاة", value: kpiData.cancelledOrdersCount.toString() },
        ];

        exportToPdf(title, summary, headers, body);
    };

    if (error) return <SetupFirestoreMessage />;
    if (!firestore) return <SetupFirestoreMessage />;
    
    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">تحليلات المبيعات</h1>
                    <p className="text-gray-400 text-sm font-bold mt-1">نظرة شاملة ومباشرة على أداء المنصة المالي.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportExcel} variant="outline" className="rounded-lg gap-2"><FileDown className="h-4 w-4"/>تصدير Excel</Button>
                    <Button onClick={handleExportPdf} variant="outline" className="rounded-lg gap-2"><Printer className="h-4 w-4"/>طباعة التقرير</Button>
                    <Button onClick={fetchData} variant="ghost" size="icon" disabled={loading} className="rounded-lg"><RefreshCw className={cn("h-4 w-4", loading && 'animate-spin')}/></Button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard isLoading={loading} title="إجمالي المبيعات" value={`${kpiData.totalSales.toLocaleString()} ر.ي`} description="فقط من الطلبات المكتملة" Icon={DollarSign} iconColorClass="text-green-500" />
                <KpiCard isLoading={loading} title="صافي الربح" value={`${kpiData.netProfit.toLocaleString()} ر.ي`} description="أرباح المنصة من العمولة (تقديري)" Icon={TrendingUp} iconColorClass="text-purple-500" />
                <KpiCard isLoading={loading} title="الطلبات المكتملة" value={String(kpiData.completedOrdersCount)} description="الطلبات التي تم توصيلها بنجاح" Icon={ShoppingBag} iconColorClass="text-blue-500" />
                <KpiCard isLoading={loading} title="الطلبات الملغاة" value={String(kpiData.cancelledOrdersCount)} description="الطلبات التي تم إلغاؤها أو رفضها" Icon={XCircle} iconColorClass="text-red-500" />
            </div>
            
            <Card className="shadow-sm rounded-lg p-4">
                 <div className="flex flex-wrap items-center gap-3">
                    <DateRangePickerWithPresets date={date} setDate={setDate} />
                    <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className="w-[160px] rounded-lg"><SelectValue placeholder="فلترة بالمتجر" /></SelectTrigger><SelectContent><SelectItem value="all">كل المتاجر</SelectItem>{stores.map(s => <SelectItem key={s.id} value={s.id!}>{s.name_ar}</SelectItem>)}</SelectContent></Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] rounded-lg"><SelectValue placeholder="فلترة بالحالة" /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statusMap).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select>
                    <Select value={cityFilter} onValueChange={setCityFilter}><SelectTrigger className="w-[160px] rounded-lg"><SelectValue placeholder="فلترة بالمدينة" /></SelectTrigger><SelectContent><SelectItem value="all">كل المدن</SelectItem>{cities.map(c => <SelectItem key={c.id} value={c.id!}>{c.name_ar}</SelectItem>)}</SelectContent></Select>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}><SelectTrigger className="w-[160px] rounded-lg"><SelectValue placeholder="طريقة الدفع" /></SelectTrigger><SelectContent><SelectItem value="all">الكل</SelectItem>{Object.entries(paymentMethodMap).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select>
                 </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3 shadow-sm rounded-lg">
                    <CardHeader><CardTitle>منحنى المبيعات اليومي</CardTitle></CardHeader>
                    <CardContent className="h-80 pr-6">
                        {loading ? <ChartSkeleton/> : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000)}k`} />
                                    <Tooltip contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }} />
                                    <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#salesGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <EmptyState />}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2 shadow-sm rounded-lg">
                    <CardHeader><CardTitle>حالات الطلبات</CardTitle></CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        {loading ? <ChartSkeleton/> : statusDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                                        {statusDistribution.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value} طلب`, name]} />
                                    <Legend iconType="circle" formatter={(value) => <span className="text-xs font-bold text-muted-foreground">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        ): <EmptyState />}
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm rounded-lg">
                <CardHeader>
                    <CardTitle>سجل العمليات المفصل</CardTitle>
                    <CardDescription>قائمة بالطلبات التي تطابق الفلاتر المحددة.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[500px]">
                  <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                              <TableHead className="text-right">الطلب</TableHead>
                              <TableHead className="text-center">المتجر</TableHead>
                              <TableHead className="text-center">الإجمالي</TableHead>
                              <TableHead className="text-center">الحالة</TableHead>
                              <TableHead className="text-center">طريقة الدفع</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {loading ? Array.from({length: 7}).map((_, i) => <TableRowSkeleton key={i} />)
                          : filteredOrders.length > 0 ? filteredOrders.map(order => (
                              <TableRow key={order.id} className="hover:bg-muted/50">
                                  <TableCell>
                                      <div className="font-bold text-sm">{userMap.get(order.clientUid) || 'عميل غير معروف'}</div>
                                      <div className="text-xs text-muted-foreground font-mono">{format(parseISO(order.created_at), 'dd/MM/yy hh:mm a', {locale: ar})}</div>
                                  </TableCell>
                                  <TableCell className="text-center text-sm font-medium text-muted-foreground">{storeMap.get(order.storeId)?.name_ar}</TableCell>
                                  <TableCell className="text-center font-bold font-mono">{order.total_price.toLocaleString()} ر.ي</TableCell>
                                  <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: statusColors[order.status]}}></span>
                                          <span className="text-sm font-semibold">{statusMap[order.status] || order.status}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center text-sm">{paymentMethodMap[order.payment_method]}</TableCell>
                              </TableRow>
                          )) : (
                            <TableRow className="border-none"><TableCell colSpan={5} className="p-0"><EmptyState /></TableCell></TableRow>
                          )}
                      </TableBody>
                  </Table>
                  </div>
                </CardContent>
            </Card>
        </div>
    );
}
