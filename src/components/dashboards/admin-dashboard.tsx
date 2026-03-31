"use client"

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, ShoppingBag, Users, Truck, DollarSign, PackageCheck, BarChartHorizontal, PieChart as PieChartIcon, User, Percent } from "lucide-react"
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Bar, BarChart as RechartsBarChart, Legend } from "recharts"
import { useFirestore, useUser } from "@/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import SetupFirestoreMessage from "@/components/admin/setup-firestore-message";
import type { Order as OrderType, User as UserType, Store as StoreType } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";


// Skeletons
const StatCardSkeleton = () => <Skeleton className="h-32 w-full rounded-2xl" />;
const ChartSkeleton = () => <Skeleton className="h-80 w-full rounded-2xl" />;
const TableSkeleton = () => <Skeleton className="h-64 w-full rounded-2xl" />;

// Types for aggregated data
interface DailySales {
  date: string;
  sales: number;
}
interface StatusDistribution {
  name: string;
  value: number;
}
interface StorePerformance {
    name: string;
    orders: number;
    sales: number;
}

// Color mapping for charts
const statusColors: { [key: string]: string } = {
    pending: '#FBBF24', // Amber 400
    preparing: '#60A5FA', // Blue 400
    out_for_delivery: '#34D399', // Emerald 400
    delivered: '#1FAF9A', // Primary
    cancelled: '#F87171', // Red 400
    rejected: '#EF4444',     // Red 500
};

const statusLabels: { [key: string]: string } = {
    pending: 'قيد الانتظار',
    preparing: 'قيد التجهيز',
    out_for_delivery: 'في الطريق',
    delivered: 'مكتمل',
    cancelled: 'ملغي',
    rejected: 'مرفوض',
};

const COLORS = ['#1FAF9A', '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#EF4444'];

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { userData } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // State for all our BI data
  const [salesData, setSalesData] = useState<DailySales[]>([]);
  const [totalSales30d, setTotalSales30d] = useState(0);
  const [salesGrowth, setSalesGrowth] = useState(0);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [storePerformance, setStorePerformance] = useState<StorePerformance[]>([]);
  const [newUserCount, setNewUserCount] = useState(0);
  const [totalUserWallet, setTotalUserWallet] = useState(0);
  const [driverStats, setDriverStats] = useState({ mostDeliveries: {name: 'N/A', value: 0}, highestDebt: {name: 'N/A', value: 0} });


  useEffect(() => {
    if (!firestore || !userData?.roles?.is_admin) {
        if (userData && !userData.roles?.is_admin) setLoading(false); // If user is not admin, stop loading
        return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersSnapshot, ordersSnapshot, storesSnapshot] = await Promise.all([
            getDocs(collection(firestore, 'users')),
            getDocs(collection(firestore, 'orders')),
            getDocs(collection(firestore, 'stores')),
        ]);

        const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType));
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderType));
        const stores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreType));
        const storeMap = new Map(stores.map(s => [s.id, s.name_ar]));

        const today = startOfDay(new Date());
        const thirtyDaysAgo = startOfDay(subDays(today, 29));
        const sixtyDaysAgo = startOfDay(subDays(today, 59));

        // --- 1. Financial Growth Sector ---
        const salesLast30Days = orders.filter(o => {
            const orderDate = parseISO(o.created_at);
            return o.status === 'delivered' && isWithinInterval(orderDate, { start: thirtyDaysAgo, end: endOfDay(today) });
        });
        
        const salesPrev30Days = orders.filter(o => {
             const orderDate = parseISO(o.created_at);
            return o.status === 'delivered' && isWithinInterval(orderDate, { start: sixtyDaysAgo, end: endOfDay(subDays(thirtyDaysAgo, 1)) });
        });

        const totalSalesLast30d = salesLast30Days.reduce((acc, o) => acc + o.total_price, 0);
        const totalSalesPrev30d = salesPrev30Days.reduce((acc, o) => acc + o.total_price, 0);
        
        setTotalSales30d(totalSalesLast30d);
        const growth = totalSalesPrev30d > 0 ? ((totalSalesLast30d - totalSalesPrev30d) / totalSalesPrev30d) * 100 : (totalSalesLast30d > 0 ? 100 : 0);
        setSalesGrowth(growth);
        
        const dailySales: DailySales[] = Array.from({ length: 30 }).map((_, i) => ({
            date: format(subDays(today, 29 - i), 'MM/dd'),
            sales: 0,
        }));

        salesLast30Days.forEach(order => {
            const dateStr = format(parseISO(order.created_at), 'MM/dd');
            const day = dailySales.find(d => d.date === dateStr);
            if (day) day.sales += order.total_price;
        });
        setSalesData(dailySales);

        // --- 2. Operational Efficiency Sector ---
        const statusCounts = orders.reduce((acc, order) => {
            const status = order.status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
            name: statusLabels[name] || name,
            value,
        }));
        setStatusDistribution(statusChartData);

        const storeAggregates = orders.reduce((acc, order) => {
            if (!acc[order.storeId]) {
                acc[order.storeId] = { orders: 0, sales: 0 };
            }
            acc[order.storeId].orders += 1;
            if (order.status === 'delivered') {
                acc[order.storeId].sales += order.total_price;
            }
            return acc;
        }, {} as { [key: string]: { orders: number, sales: number } });

        const storePerfData = Object.entries(storeAggregates)
            .map(([storeId, data]) => ({
                name: storeMap.get(storeId) || `متجر غير معروف`,
                ...data,
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);
        setStorePerformance(storePerfData);

        // --- 3. Human Resources Analytics ---
        const sevenDaysAgo = startOfDay(subDays(today, 6));
        const newUsers = users.filter(u => {
            const joinDate = parseISO(u.created_at);
            return isWithinInterval(joinDate, { start: sevenDaysAgo, end: endOfDay(today) });
        }).length;
        setNewUserCount(newUsers);

        const drivers = users.filter(u => u.roles?.is_driver);
        const driverDeliveries = drivers.map(driver => ({
            uid: driver.uid,
            name: driver.full_name || 'مندوب غير معروف',
            deliveries: orders.filter(o => o.driverUid === driver.uid && o.status === 'delivered').length,
            debt: driver.driver_details?.wallet_balance ? Math.abs(Math.min(0, driver.driver_details.wallet_balance)) : 0,
        }));
        
        const topDriver = driverDeliveries.reduce((max, d) => d.deliveries > max.deliveries ? d : max, {name: 'N/A', deliveries: 0});
        const topDebtor = driverDeliveries.reduce((max, d) => d.debt > max.debt ? d : max, {name: 'N/A', debt: 0});
        
        setDriverStats({
            mostDeliveries: { name: topDriver.name, value: topDriver.deliveries },
            highestDebt: { name: topDebtor.name, value: topDebtor.debt },
        });

        // --- 4. Cash Flow Control ---
        const totalWallets = users.reduce((acc, user) => acc + (user.wallet_balance || 0), 0);
        setTotalUserWallet(totalWallets);

        setLoading(false);
      } catch (e: any) {
        console.error("Dashboard data fetching failed: ", e);
        setError(e);
        setLoading(false);
      }
    };
    fetchData();
  }, [firestore, userData]);

  if (!userData) {
      // Still waiting for user data to determine role
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!userData.roles?.is_admin) {
    return (
        <Card className="m-auto mt-10 max-w-lg text-center">
            <CardHeader><CardTitle className="text-destructive">وصول مرفوض</CardTitle></CardHeader>
            <CardContent><p>ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة.</p></CardContent>
        </Card>
    );
  }

  if (error) {
      return <SetupFirestoreMessage />;
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">لوحة مؤشرات الأداء (BI)</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1">نظرة شاملة على أداء منصة أبشر.</p>
        </div>

        {/* Section 1: Financial Growth */}
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black"><TrendingUp className="text-primary"/> النمو المالي</CardTitle>
                <CardDescription>تحليل إجمالي المبيعات المحققة خلال آخر 30 يوماً.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 h-[350px] p-4">
                    {loading ? <ChartSkeleton/> : (
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                <YAxis tickFormatter={(val) => `${(val/1000)}k`} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))' }}
                                    labelStyle={{ fontWeight: 'bold' }}
                                    formatter={(value: number) => [value.toLocaleString() + ' ر.ي', 'المبيعات']}
                                />
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className="md:col-span-1 space-y-4 p-4 bg-gray-50 rounded-lg">
                    {loading ? <StatCardSkeleton /> : (
                        <>
                         <div>
                            <p className="text-sm text-muted-foreground font-bold">مبيعات آخر 30 يوم</p>
                            <p className="text-3xl font-black text-primary">{totalSales30d.toLocaleString()} ر.ي</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-bold">النمو عن الشهر السابق</p>
                            <p className={`text-2xl font-black ${salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>{salesGrowth.toFixed(1)}%</p>
                        </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 2: Operational Efficiency */}
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-black"><PackageCheck className="text-primary"/> كفاءة العمليات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div>
                        <h3 className="font-bold mb-2">توزيع حالات الطلبات</h3>
                        <div className="h-48 w-full">
                           {loading ? <ChartSkeleton/> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2}>
                                            {statusDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={statusColors[entry.name.toLowerCase().replace(' ', '_')] || COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => [value, 'طلب']}/>
                                        <Legend iconType="circle" formatter={(value) => <span className="text-xs font-bold">{value}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                           )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top Stores */}
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-black"><BarChartHorizontal className="text-primary"/> المتاجر الأعلى مبيعاً</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 w-full">
                       {loading ? <ChartSkeleton/> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart layout="vertical" data={storePerformance} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, width: 70 }} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))' }}/>
                                    <Bar dataKey="sales" name="المبيعات" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]} barSize={20} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                       )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 3: HR */}
            <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                 <CardHeader><CardTitle className="flex items-center gap-2 font-black"><Users className="text-primary"/> تحليلات القوى البشرية</CardTitle></CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-sm font-bold text-muted-foreground">المستخدمون الجدد (آخر 7 أيام)</p>
                        {loading ? <Skeleton className="h-10 w-20 mx-auto mt-2" /> : <p className="text-4xl font-black text-primary">{newUserCount}</p>}
                     </div>
                     <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-bold text-sm mb-2">أبطال التوصيل</h4>
                        {loading ? <div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></div> : (
                            <div className="text-xs space-y-2">
                                <p><strong className="ml-1">الأكثر تسليماً:</strong>{driverStats.mostDeliveries.name} ({driverStats.mostDeliveries.value} طلب)</p>
                                <p><strong className="ml-1">الأعلى مديونية:</strong>{driverStats.highestDebt.name} ({driverStats.highestDebt.value.toLocaleString()} ر.ي)</p>
                            </div>
                        )}
                     </div>
                 </CardContent>
            </Card>
            {/* Section 4: Cash Flow */}
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="flex items-center gap-2 font-black"><DollarSign className="text-primary"/> التحكم المالي</CardTitle></CardHeader>
                <CardContent className="text-center">
                     <p className="text-sm font-bold text-muted-foreground">إجمالي أرصدة محافظ العملاء</p>
                    {loading ? <Skeleton className="h-10 w-32 mx-auto mt-2" /> : <p className="text-4xl font-black text-amber-500">{totalUserWallet.toLocaleString()} ر.ي</p>}
                    <p className="text-xs text-muted-foreground mt-1">يمثل هذا المبلغ التزاماً مالياً على المنصة.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
