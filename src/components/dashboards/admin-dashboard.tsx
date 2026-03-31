"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  TrendingUp, ShoppingBag, Truck, Users, 
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
  ChevronLeft,
  Store,
  Building2,
  DollarSign,
  PackageCheck,
  User,
  BadgePercent
} from "lucide-react"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFirestore, useUser } from "@/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import SetupFirestoreMessage from "@/components/admin/setup-firestore-message";
import type { Order as OrderType, User as UserType } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { format, subDays, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";

const StatCardSkeleton = () => (
    <Card className="border-border shadow-sm rounded-2xl bg-card">
        <CardContent className="p-6">
            <Skeleton className="h-12 w-12 rounded-2xl mb-4" />
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
        </CardContent>
    </Card>
);

const ChartSkeleton = () => <Skeleton className="h-full w-full" />;

const TableRowSkeleton = () => (
    <tr className="border-b border-border">
        <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
        <td className="px-6 py-4"><Skeleton className="h-6 w-32" /></td>
        <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
        <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
        <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
        <td className="px-6 py-4 text-left"><Skeleton className="h-6 w-16" /></td>
    </tr>
)

const statusLabels: { [key: string]: string } = {
    pending: 'قيد الانتظار',
    preparing: 'قيد التجهيز',
    out_for_delivery: 'في الطريق',
    delivered: 'تم التوصيل',
    cancelled: 'ملغي',
    rejected: 'مرفوض',
};

const statusColors: { [key: string]: string } = {
    pending: '#F59E0B',    // Amber
    preparing: '#3B82F6',    // Blue
    out_for_delivery: '#14B8A6', // Teal
    delivered: '#1FAF9A',    // Green (Primary)
    cancelled: '#EF4444',    // Red
    rejected: '#DC2626',     // Red Darker
};

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { userData } = useUser();
  const [firestoreError, setFirestoreError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  // State for stats and charts
  const [stats, setStats] = useState({
      totalSales: 0,
      totalOrders: 0,
      totalDrivers: 0,
      totalUsers: 0
  });
  const [weeklySalesData, setWeeklySalesData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderType[]>([]);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) return;
      setLoading(true);

      try {
        const [usersSnapshot, ordersSnapshot] = await Promise.all([
            getDocs(collection(firestore, 'users')),
            getDocs(collection(firestore, 'orders'))
        ]);
        
        // --- Process Users ---
        const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType));
        const tempUserMap = new Map(users.map(u => [u.uid, u.full_name || 'مستخدم غير معروف']));
        setUserMap(tempUserMap);
        
        const totalUsers = users.length;
        const totalDrivers = users.filter(u => u.roles?.is_driver).length;

        // --- Process Orders ---
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderType));
        const totalOrders = orders.length;
        
        // Calculate Total Sales
        const totalSales = orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + o.total_price, 0);

        // Calculate Weekly Sales
        const today = new Date();
        const weeklySales = Array(7).fill(0).map((_, i) => {
            const d = subDays(today, i);
            return { date: d, sales: 0, name: format(d, 'eee', { locale: ar }) };
        }).reverse();

        orders.filter(o => o.status === 'delivered').forEach(order => {
            const orderDate = new Date(order.created_at);
            const diff = differenceInDays(today, orderDate);
            if (diff >= 0 && diff < 7) {
                weeklySales[6 - diff].sales += order.total_price;
            }
        });
        setWeeklySalesData(weeklySales);

        // Calculate Order Status distribution
        const statusCounts = orders.reduce((acc, order) => {
            const status = order.status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        
        const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
            name: statusLabels[name] || name,
            value,
            color: statusColors[name] || '#A1A1AA'
        }));
        setOrderStatusData(statusChartData);
        
        // Get Recent Orders
        const recentOrdersQuery = query(collection(firestore, "orders"), orderBy("created_at", "desc"), limit(5));
        const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
        setRecentOrders(recentOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as OrderType)));


        // --- Update State ---
        setStats({ totalSales, totalOrders, totalDrivers, totalUsers });
        setFirestoreError(null);
      } catch (error: any) {
        console.error("Critical Error fetching dashboard stats:", error);
        setFirestoreError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore]);
  
  if (!firestore || firestoreError) {
    return <SetupFirestoreMessage />;
  }
  
  if (userData && !userData.roles?.is_admin) {
    return (
        <Card className="m-auto mt-10 max-w-lg text-center">
            <CardHeader><CardTitle className="text-destructive">وصول مرفوض</CardTitle></CardHeader>
            <CardContent><p>ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة.</p></CardContent>
        </Card>
    );
  }

  const KpiCard = ({ label, value, icon: Icon, color, bg }: { label: string, value: string | number, icon: React.ElementType, color: string, bg: string }) => (
      <Card className="border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-lg transition-all group bg-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", bg)}>
              <Icon className={cn("h-6 w-6", color)} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
            <h3 className="text-2xl font-black text-foreground tabular-nums">
                {typeof value === 'number' ? value.toLocaleString() : value}
                {label === 'إجمالي المبيعات' && <small className="text-sm text-muted-foreground ml-1">ر.ي</small>}
            </h3>
          </div>
        </CardContent>
      </Card>
  );


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">نظرة عامة على النظام</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1">أهلاً بك مجدداً، {userData?.full_name?.split(' ')[0] || 'أيها المدير'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? Array.from({length: 4}).map((_, i) => <StatCardSkeleton key={i} />) : (
            <>
                <KpiCard label="إجمالي المبيعات" value={stats.totalSales} icon={DollarSign} color="text-green-500" bg="bg-green-500/10" />
                <KpiCard label="إجمالي الطلبات" value={stats.totalOrders} icon={PackageCheck} color="text-sky-500" bg="bg-sky-500/10" />
                <KpiCard label="إجمالي المستخدمين" value={stats.totalUsers} icon={Users} color="text-purple-500" bg="bg-purple-500/10" />
                <KpiCard label="إجمالي المناديب" value={stats.totalDrivers} icon={Truck} color="text-orange-500" bg="bg-orange-500/10" />
            </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> نمو المبيعات الأسبوعي</CardTitle>
            <Badge variant="outline" className="rounded-xl font-bold">آخر ٧ أيام</Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              {loading ? <ChartSkeleton/> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklySalesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `${(value / 1000)}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '15px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', direction: 'rtl' }}
                        labelStyle={{ fontWeight: 'black', marginBottom: '5px' }}
                        formatter={(value: number) => [value.toLocaleString() + ' ر.ي', 'المبيعات']}
                      />
                      <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="p-6 border-b border-border">
            <CardTitle className="text-sm font-black flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> توزيع حالات الطلبات</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[220px] w-full">
              {loading ? <ChartSkeleton/> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderStatusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {orderStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }} formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {orderStatusData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-black text-foreground/80">{item.name}</span>
                  <span className="text-[10px] font-bold text-muted-foreground mr-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden">
        <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> أحدث الطلبات</CardTitle>
           <Button variant="link" asChild className="text-xs font-black text-primary gap-1">
             <a href="/admin/confirm-orders">عرض الكل <ChevronLeft className="h-3 w-3" /></a>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                  <th className="px-6 py-4">رقم الطلب</th>
                  <th className="px-6 py-4">العميل</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-left">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? Array.from({length: 5}).map((_,i) => <TableRowSkeleton key={i} />) : recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-black text-xs text-primary bg-primary/10 px-2 py-1 rounded-md">#{order.id?.slice(-6)}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-xs text-foreground/90">{userMap.get(order.clientUid) || '...'}</td>
                    <td className="px-6 py-4">
                      <span className="font-black text-xs text-foreground">{order.total_price.toLocaleString()} <small className="text-[10px] text-muted-foreground">ريال</small></span>
                    </td>
                    <td className="px-6 py-4">
                       <Badge style={{ backgroundColor: `${statusColors[order.status]}20`, color: statusColors[order.status] }} className="rounded-xl border-none font-black px-3 py-1 text-[9px]">
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <span className="text-[10px] font-bold text-muted-foreground">{format(new Date(order.created_at), 'hh:mm a', { locale: ar })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
