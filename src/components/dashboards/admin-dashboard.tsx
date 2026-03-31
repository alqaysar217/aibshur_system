"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, ShoppingBag, PieChart as PieChartIcon } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Bar, BarChart as RechartsBarChart, Legend } from "recharts"
import { useFirestore, useUser } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import SetupFirestoreMessage from "@/components/admin/setup-firestore-message";
import type { Order as OrderType, Store as StoreType } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { format, subDays, startOfDay, isWithinInterval, parseISO, endOfDay } from "date-fns";
import { Loader2 } from "lucide-react";

// Skeletons
const ChartSkeleton = () => <Skeleton className="h-80 w-full rounded-2xl" />;

// Types for aggregated data
interface DailySales {
  date: string;
  sales: number;
}
interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}
interface StorePerformance {
    name: string;
    sales: number;
}

// Color mapping for charts, aligned with user request
const statusColors: { [key: string]: string } = {
    delivered: '#1FAF9A',      // Green for success
    pending: '#A0AEC0',        // Gray for pending
    preparing: '#FBBF24',     // Amber for in-progress state
    out_for_delivery: '#60A5FA',// Blue for in-transit
    cancelled: '#F87171',      // Red for cancelled
    rejected: '#EF4444',       // Darker Red for rejected
};

const statusLabels: { [key: string]: string } = {
    pending: 'قيد الانتظار',
    preparing: 'قيد التجهيز',
    out_for_delivery: 'في الطريق',
    delivered: 'مكتمل',
    cancelled: 'ملغي',
    rejected: 'مرفوض',
};

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { userData } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // State for our BI data
  const [salesData, setSalesData] = useState<DailySales[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [storePerformance, setStorePerformance] = useState<StorePerformance[]>([]);

  useEffect(() => {
    if (!firestore) {
        return;
    }
     if (userData && !userData.roles?.is_admin) {
        setLoading(false);
        return;
    }
     if (!userData) {
         // wait for user data
         return;
     }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordersSnapshot, storesSnapshot] = await Promise.all([
            getDocs(collection(firestore, 'orders')),
            getDocs(collection(firestore, 'stores')),
        ]);

        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderType));
        const stores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreType));
        const storeMap = new Map(stores.map(s => [s.id, s.name_ar]));

        const today = startOfDay(new Date());
        const thirtyDaysAgo = startOfDay(subDays(today, 29));

        // --- 1. Financial Growth (Area Chart) ---
        const salesLast30Days = orders.filter(o => {
            const orderDate = parseISO(o.created_at);
            return o.status === 'delivered' && isWithinInterval(orderDate, { start: thirtyDaysAgo, end: endOfDay(today) });
        });
        
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

        // --- 2. Store Performance (Bar Chart) ---
        const storeAggregates = orders.reduce((acc, order) => {
            if (order.status !== 'delivered') return acc; // Only count sales from delivered orders
            if (!acc[order.storeId]) {
                acc[order.storeId] = { sales: 0 };
            }
            acc[order.storeId].sales += order.total_price;
            return acc;
        }, {} as { [key: string]: { sales: number } });

        const storePerfData = Object.entries(storeAggregates)
            .map(([storeId, data]) => ({
                name: storeMap.get(storeId) || `متجر غير معروف`,
                sales: data.sales,
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);
        setStorePerformance(storePerfData);

        // --- 3. Orders Status (Donut Chart) ---
        const statusCounts = orders.reduce((acc, order) => {
            const status = order.status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
            name: statusLabels[name] || name,
            value,
            color: statusColors[name] || '#cccccc'
        }));
        setStatusDistribution(statusChartData);

      } catch (e: any) {
        console.error("Dashboard data fetching failed: ", e);
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [firestore, userData]);

  if (!userData && !loading) {
      // Still waiting for user data to determine role
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (userData && !userData.roles?.is_admin) {
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
          <p className="text-muted-foreground text-sm font-bold mt-1">نظرة شاملة ومباشرة على أداء منصة أبشر.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3 border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-black"><TrendingUp className="text-primary"/> منحنى النمو المالي</CardTitle>
                    <CardDescription>إجمالي المبيعات المحققة خلال آخر 30 يوماً.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] p-4">
                    {loading ? <ChartSkeleton/> : (
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                <YAxis tickFormatter={(val) => `${(val/1000)}k`} tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}
                                    labelStyle={{ fontWeight: 'bold' }}
                                    formatter={(value: number) => [value.toLocaleString() + ' ر.ي', 'المبيعات']}
                                />
                                <defs>
                                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#salesGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

             <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-black"><PieChartIcon className="text-primary"/> مؤشر حالة العمليات</CardTitle>
                    <CardDescription>توزيع حالات جميع الطلبات في النظام.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    {loading ? <ChartSkeleton/> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                                    {statusDistribution.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(value) => [value, 'طلب']}/>
                                <Legend iconType="circle" formatter={(value) => <span className="text-xs font-bold">{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                   )}
                </CardContent>
            </Card>
        </div>
        
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black"><ShoppingBag className="text-primary"/> تحليل كفاءة المتاجر</CardTitle>
                <CardDescription>أفضل 5 متاجر من حيث حجم المبيعات.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] p-4">
               {loading ? <ChartSkeleton/> : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart layout="vertical" data={storePerformance} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--accent))' }}
                                contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}
                                formatter={(value: number) => [value.toLocaleString() + ' ر.ي', 'المبيعات']}
                            />
                            <Bar dataKey="sales" name="المبيعات" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]} barSize={25} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
               )}
            </CardContent>
        </Card>
    </div>
  );
}
