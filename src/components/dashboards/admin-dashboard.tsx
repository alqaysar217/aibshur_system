"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, ShoppingBag, Truck, Users, 
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
  ChevronLeft,
  Store,
  Building2
} from "lucide-react"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFirestore } from "@/firebase";
import { collection, getCountFromServer } from "firebase/firestore";
import SetupFirestoreMessage from "@/components/admin/setup-firestore-message";

const SALES_DATA = [
  { name: "السبت", sales: 45000 },
  { name: "الأحد", sales: 52000 },
  { name: "الاثنين", sales: 48000 },
  { name: "الثلاثاء", sales: 61000 },
  { name: "الأربعاء", sales: 55000 },
  { name: "الخميس", sales: 72000 },
  { name: "الجمعة", sales: 85000 },
]

const CATEGORY_DATA = [
  { name: "مطاعم", value: 45, color: "#1FAF9A" },
  { name: "كافيهات", value: 20, color: "#F59E0B" },
  { name: "صيدليات", value: 15, color: "#3B82F6" },
  { name: "ماركت", value: 20, color: "#EC4899" },
]


const RECENT_ORDERS = [
  { id: "ORD-9921", customer: "عمر دعكيك", store: "مطعم مذاقي", amount: "٤,٥٠٠", status: "delivered", time: "منذ ٥ دقائق" },
  { id: "ORD-9920", customer: "سالم محمد", store: "كافيه بن علي", amount: "١,٨٠٠", status: "onWay", time: "منذ ١٢ دقيقة" },
  { id: "ORD-9919", customer: "أحمد حسن", store: "سوبر ماركت الخليج", amount: "١٢,٤٠٠", status: "preparing", time: "منذ ٢٠ دقيقة" },
  { id: "ORD-9918", customer: "علي صالح", store: "صيدلية السلام", amount: "٣,٢٠٠", status: "pending", time: "منذ ٢٥ دقيقة" },
  { id: "ORD-9917", customer: "محمد عمر", store: "عسل حضرمي", amount: "١٥,٠٠٠", status: "canceled", time: "منذ ٣٠ دقيقة" },
]

export default function AdminDashboard() {
  const firestore = useFirestore();
  const [firestoreError, setFirestoreError] = useState<Error | null>(null);
  const [stats, setStats] = useState([
    { label: "إجمالي المتاجر", value: "...", icon: Store, trend: "", up: true, color: "text-sky-600", bg: "bg-sky-50" },
    { label: "إجمالي المدن", value: "...", icon: Building2, trend: "", up: true, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
    { label: "المناديب النشطين", value: "0", icon: Truck, trend: "", up: false, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "مستخدمين جدد", value: "0", icon: Users, trend: "", up: true, color: "text-purple-600", bg: "bg-purple-50" },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!firestore) {
        // This case is handled by the root check below
        return;
      }

      try {
        const storesCol = collection(firestore, 'stores');
        const citiesCol = collection(firestore, 'cities');

        const [storesSnapshot, citiesSnapshot] = await Promise.all([
          getCountFromServer(storesCol),
          getCountFromServer(citiesCol),
        ]);
        
        const storesCount = storesSnapshot?.data().count ?? 0;
        const citiesCount = citiesSnapshot?.data().count ?? 0;

        setStats(prevStats => prevStats.map(stat => {
          if (stat.label === "إجمالي المتاجر") return { ...stat, value: storesCount.toString() };
          if (stat.label === "إجمالي المدن") return { ...stat, value: citiesCount.toString() };
          return stat;
        }));
        setFirestoreError(null); // Clear error on success

      } catch (error: any) {
        console.error("Critical Error fetching dashboard stats:", error);
        // This is a more robust check for Firestore setup errors.
        const msg = error.message || '';
        if (msg.includes('database (default) does not exist') || msg.includes('Could not reach Firestore backend') || msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions') || msg.includes('Cloud Firestore API has not been used')) {
            setFirestoreError(error);
        }
      }
    };

    fetchStats();
  }, [firestore]);

  // If firestore instance is not available OR there's a specific setup error
  if (!firestore || firestoreError) {
    return <SetupFirestoreMessage />;
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">نظرة عامة على النظام</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">أهلاً بك مجدداً، إليك ملخص نشاط تطبيق أبشر لليوم</p>
        </div>
        <Button className="rounded-lg bg-primary hover:bg-primary/90 font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <TrendingUp className="h-4 w-4" /> تحميل التقارير
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm rounded-[20px] overflow-hidden hover:shadow-md transition-all group bg-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                {stat.trend && (
                  <Badge className={cn(
                    "rounded-full border-none font-black px-2 py-0.5 text-[10px] gap-1",
                    stat.up ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {stat.trend}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-black text-gray-900 tabular-nums">{stat.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[25px] bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> نمو المبيعات الأسبوعي
            </CardTitle>
            <Badge variant="outline" className="rounded-xl font-bold">آخر ٧ أيام</Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SALES_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', direction: 'rtl' }}
                    labelStyle={{ fontWeight: 'black', marginBottom: '5px' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#1FAF9A" strokeWidth={4} dot={{ r: 6, fill: '#1FAF9A', strokeWidth: 2, stroke: '#FFF' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[25px] bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-gray-50">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" /> توزيع المتاجر حسب الفئة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CATEGORY_DATA}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {CATEGORY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {CATEGORY_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-black text-gray-600">{item.name}</span>
                  <span className="text-[10px] font-bold text-gray-400 mr-auto">{item.value}٪</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="border-none shadow-sm rounded-[25px] bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" /> أحدث الطلبات
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs font-black text-primary gap-1">
            عرض الكل <ChevronLeft className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="px-6 py-4">رقم الطلب</th>
                  <th className="px-6 py-4">العميل</th>
                  <th className="px-6 py-4">المتجر</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-left">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {RECENT_ORDERS.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-black text-xs text-primary bg-primary/5 px-2 py-1 rounded-md">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-xs text-gray-700">{order.customer}</td>
                    <td className="px-6 py-4 font-bold text-xs text-gray-700">{order.store}</td>
                    <td className="px-6 py-4">
                      <span className="font-black text-xs text-gray-900">{order.amount} <small className="text-[10px] text-gray-400">ريال</small></span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn(
                        "rounded-xl border-none font-black px-3 py-1 text-[9px]",
                        order.status === 'delivered' ? "bg-green-100 text-green-600" :
                        order.status === 'pending' ? "bg-yellow-100 text-yellow-600" :
                        order.status === 'canceled' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {order.status === 'delivered' ? 'تم التوصيل' : 
                         order.status === 'onWay' ? 'في الطريق' :
                         order.status === 'preparing' ? 'جاري التحضير' :
                         order.status === 'pending' ? 'قيد الانتظار' : 'ملغي'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] font-bold text-gray-400">{order.time}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
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
