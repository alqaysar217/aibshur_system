"use client"

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Building, Truck, MapPin, DollarSign, TrendingUp, HeartHandshake, Crown, Loader2, ShoppingCart, BarChart, PieChart as PieChartIcon } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Bar, BarChart as RechartsBarChart, Legend } from "recharts"
import { useFirestore, useUser } from "@/firebase";
import { collection, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import SetupFirestoreMessage from "@/components/admin/setup-firestore-message";
import type { Order as OrderType, Store as StoreType, User as UserType, City, Donation, AppConfig } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { format, subDays, startOfDay, isWithinInterval, parseISO, endOfDay, formatDistanceToNow, eachDayOfInterval } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";

// Skeletons for loading state
const KpiSkeleton = () => <Skeleton className="h-28 w-full rounded-lg" />;
const ChartSkeleton = () => <Skeleton className="h-[350px] w-full rounded-lg" />;
const ActivitySkeleton = () => <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;

// Card for Key Performance Indicators
const KpiCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) => {
    if (isLoading) return <KpiSkeleton />;
    return (
        <Card className="border-none shadow-sm rounded-lg bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-5 w-5 text-primary drop-shadow-[0_2px_4px_rgba(27,175,154,0.4)]" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black">{value}</div>
            </CardContent>
        </Card>
    );
};

// Activity Item for live feed
const ActivityItem = ({ text, time }: { text: string, time: string }) => (
    <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full mt-1">
            <ShoppingCart className="h-4 w-4 text-primary" />
        </div>
        <div>
            <p className="text-sm font-bold text-foreground">{text}</p>
            <p className="text-xs text-muted-foreground">{time}</p>
        </div>
    </div>
);

// Color mapping for charts, using the primary identity color
const statusColors: { [key: string]: string } = {
    delivered: '#1FAF9A',
    pending: '#A0AEC0',
    preparing: '#F59E0B',
    out_for_delivery: '#3B82F6',
    cancelled: '#F87171',
    rejected: '#EF4444',
};

const statusLabels: { [key: string]: string } = {
    pending: 'قيد الانتظار',
    preparing: 'قيد التجهيز',
    out_for_delivery: 'في الطريق',
    delivered: 'مكتمل',
    cancelled: 'ملغي',
    rejected: 'مرفوض',
};

const donationTypeLabels: { [key: string]: string } = {
  siquia: 'سقيا ماء',
  itiam: 'إطعام مسكين',
  jariyah: 'صدقة جارية',
  general: 'تبرع عام',
};


export default function AdminDashboard() {
  const firestore = useFirestore();
  const { userData } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // States for processed BI data
  const [kpiData, setKpiData] = useState<any>({});
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [statusChartData, setStatusChartData] = useState<any[]>([]);
  const [storeChartData, setStoreChartData] = useState<any[]>([]);
  const [donationChartData, setDonationChartData] = useState<any[]>([]);
  const [liveActivity, setLiveActivity] = useState<OrderType[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Effect for initial data load for charts and KPIs
  useEffect(() => {
    if (!firestore || !userData) return;
    if (!userData.roles?.is_admin) {
        setLoading(false);
        return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersSnapshot, storesSnapshot, citiesSnapshot, ordersSnapshot, donationsSnapshot, configSnapshot] = await Promise.all([
            getDocs(collection(firestore, 'users')),
            getDocs(collection(firestore, 'stores')),
            getDocs(collection(firestore, 'cities')),
            getDocs(collection(firestore, 'orders')),
            getDocs(collection(firestore, 'donations')),
            getDocs(collection(firestore, 'settings')),
        ]);

        const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType));
        const stores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreType));
        const cities = citiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as City));
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderType));
        const donations = donationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation));
        const appConfig = configSnapshot.docs.find(d => d.id === 'app_config')?.data() as AppConfig;
        const platformFee = appConfig?.financial?.platform_fee_percentage || 10;
        
        // --- Process KPI Data ---
        const totalSales = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_price, 0);
        setKpiData({
            totalUsers: users.length,
            totalStores: stores.length,
            totalDrivers: users.filter(u => u.roles?.is_driver).length,
            totalCities: cities.length,
            totalSales: totalSales.toLocaleString(),
            netProfit: (totalSales * (platformFee / 100)).toLocaleString(),
            totalDonations: donations.reduce((sum, d) => sum + d.amount, 0).toLocaleString(),
            vipSubscribers: users.filter(u => u.vip_details?.isActive).length,
        });

        // --- Process Chart Data ---
        const storeMap = new Map(stores.map(s => [s.id, s.name_ar]));
        const today = startOfDay(new Date());
        const thirtyDaysAgo = startOfDay(subDays(today, 29));
        
        // Sales Chart
        const dailySales: { [key: string]: number } = {};
        eachDayOfInterval({ start: thirtyDaysAgo, end: today }).forEach(day => {
            dailySales[format(day, 'MM/dd')] = 0;
        });
        orders.forEach(o => {
            if (o.status === 'delivered' && isWithinInterval(parseISO(o.created_at), { start: thirtyDaysAgo, end: endOfDay(today) })) {
                const day = format(parseISO(o.created_at), 'MM/dd');
                if (dailySales[day] !== undefined) {
                    dailySales[day] += o.total_price;
                }
            }
        });
        setSalesChartData(Object.entries(dailySales).map(([date, sales]) => ({ date, sales })));
        
        // Status Chart
        const statusCounts = orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        setStatusChartData(Object.entries(statusCounts).map(([name, value]) => ({ name: statusLabels[name] || name, value, color: statusColors[name] || '#cccccc' })));

        // Store Chart
        const storeAggregates = orders.filter(o => o.status === 'delivered').reduce((acc, order) => {
            acc[order.storeId] = (acc[order.storeId] || 0) + order.total_price;
            return acc;
        }, {} as { [key: string]: number });
        setStoreChartData(Object.entries(storeAggregates).map(([storeId, sales]) => ({ name: storeMap.get(storeId) || storeId.slice(0,5), sales })).sort((a,b) => b.sales - a.sales).slice(0, 5));

        // Donation Chart
        const donationAggregates = donations.reduce((acc, donation) => {
            acc[donation.donationType] = (acc[donation.donationType] || 0) + donation.amount;
            return acc;
        }, {} as { [key: string]: number });
        setDonationChartData(Object.entries(donationAggregates).map(([type, value]) => ({ name: donationTypeLabels[type] || type, value })));

      } catch (e: any) {
        console.error("Dashboard data fetching failed: ", e);
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [firestore, userData]);

  // Effect for live activity feed
  useEffect(() => {
    if (!firestore || !userData?.roles?.is_admin) return;
    const q = query(collection(firestore, 'orders'), orderBy('created_at', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderType));
        setLiveActivity(activities);
        setActivityLoading(false);
    }, (err) => {
        console.error("Live activity feed error:", err);
        setActivityLoading(false);
    });
    return () => unsubscribe();
  }, [firestore, userData]);
  

  if (!userData && loading) {
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (userData && !userData.roles?.is_admin) {
    return (
        <Card className="m-auto mt-10 max-w-lg text-center">
            <CardHeader><CardTitle className="text-destructive font-black">وصول مرفوض</CardTitle></CardHeader>
            <CardContent><p>ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة.</p></CardContent>
        </Card>
    );
  }

  if (error) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">لوحة مؤشرات الأداء</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1">نظرة شاملة ومباشرة على أداء منصة أبشر.</p>
        </div>
        
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="إجمالي المستخدمين" value={kpiData.totalUsers || '0'} icon={Users} isLoading={loading} />
            <KpiCard title="عدد المتاجر" value={kpiData.totalStores || '0'} icon={Building} isLoading={loading} />
            <KpiCard title="عدد المناديب" value={kpiData.totalDrivers || '0'} icon={Truck} isLoading={loading} />
            <KpiCard title="المدن المغطاة" value={kpiData.totalCities || '0'} icon={MapPin} isLoading={loading} />
        </div>
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="إجمالي المبيعات" value={`${kpiData.totalSales || '0'} ر.ي`} icon={DollarSign} isLoading={loading} />
            <KpiCard title="صافي الأرباح (تقديري)" value={`${kpiData.netProfit || '0'} ر.ي`} icon={TrendingUp} isLoading={loading} />
            <KpiCard title="إجمالي التبرعات" value={`${kpiData.totalDonations || '0'} ر.ي`} icon={HeartHandshake} isLoading={loading} />
            <KpiCard title="مشتركي VIP" value={kpiData.vipSubscribers || '0'} icon={Crown} isLoading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Charts Column */}
            <div className="lg:col-span-2 space-y-6">
                 <Card className="border-none shadow-sm rounded-lg bg-white overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base font-black flex items-center gap-2"><TrendingUp className="text-primary"/> منحنى النمو المالي</CardTitle>
                        <CardDescription>إجمالي المبيعات المحققة خلال آخر 30 يوماً.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] p-2 pr-4">
                        {loading ? <ChartSkeleton/> : (
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                    <Tooltip contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', fontFamily: 'Cairo' }} formatter={(value: number) => [value.toLocaleString() + ' ر.ي', 'المبيعات']} />
                                    <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-lg bg-white overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base font-black flex items-center gap-2"><Building className="text-primary"/> أفضل 5 متاجر أداءً</CardTitle>
                        <CardDescription>أعلى المتاجر تحقيقًا للمبيعات.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] p-2">
                       {loading ? <ChartSkeleton/> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart layout="vertical" data={storeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontFamily: 'Cairo' }} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--primary), 0.1)' }} contentStyle={{ borderRadius: 'var(--radius)', fontFamily: 'Cairo', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => [value.toLocaleString() + ' ر.ي', 'المبيعات']} />
                                    <Bar dataKey="sales" name="المبيعات" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                       )}
                    </CardContent>
                </Card>
            </div>

            {/* Side Column */}
            <div className="space-y-6">
                 <Card className="border-none shadow-sm rounded-lg bg-white overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base font-black">حالات الطلبات</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] flex items-center justify-center">
                        {loading ? <ChartSkeleton/> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="50%" outerRadius="70%" paddingAngle={2}>
                                        {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 'var(--radius)', fontFamily: 'Cairo' }} formatter={(value) => [value, 'طلب']}/>
                                </PieChart>
                            </ResponsiveContainer>
                       )}
                    </CardContent>
                    <CardContent className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                        {statusChartData.map(entry => (
                            <div key={entry.name} className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span>{entry.name}</span>
                            </div>
                        ))}
                    </CardContent>
                 </Card>
                  <Card className="border-none shadow-sm rounded-lg bg-white overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base font-black">توزيع التبرعات</CardTitle>
                    </CardHeader>
                     <CardContent className="h-[250px] flex items-center justify-center">
                        {loading ? <ChartSkeleton/> : (
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={donationChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" fill="hsl(var(--primary))" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => { const RADIAN = Math.PI / 180; const radius = innerRadius + (outerRadius - innerRadius) * 0.5; const x  = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy  + radius * Math.sin(-midAngle * RADIAN); return ( <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}> {`${(percent * 100).toFixed(0)}%`} </text> ); }}>
                                        {donationChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={'hsl(var(--primary))'} fillOpacity={1 - (index * 0.15)} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 'var(--radius)', fontFamily: 'Cairo' }} formatter={(value: number) => [value.toLocaleString() + ' ر.ي', 'المبلغ']} />
                                    <Legend iconType="circle" wrapperStyle={{fontSize: "12px", fontFamily: 'Cairo'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                 </Card>
                 <Card className="border-none shadow-sm rounded-lg bg-white overflow-hidden">
                     <CardHeader>
                        <CardTitle className="text-base font-black">آخر الطلبات</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {activityLoading ? <ActivitySkeleton /> : liveActivity.length > 0 ? (
                            liveActivity.map(order => (
                                <ActivityItem 
                                    key={order.id} 
                                    text={`طلب جديد برقم #${order.id?.slice(-5)}`} 
                                    time={formatDistanceToNow(parseISO(order.created_at), { addSuffix: true, locale: ar })}
                                />
                            ))
                        ) : <p className="text-sm text-center text-muted-foreground py-4">لا توجد أنشطة حديثة.</p>}
                    </CardContent>
                 </Card>
            </div>
        </div>

    </div>
  );
}
