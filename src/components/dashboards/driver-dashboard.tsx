import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DollarSign, Star, Zap, ArrowLeft, Bike } from 'lucide-react';
import type { User } from '@/lib/types';
import StatsCard from './stats-card';
import SalesChart from './sales-chart';
import OrderListItem from '../order/order-list-item';
import { mockOrders } from '@/lib/mock-data';
import Link from 'next/link';

export default function DriverDashboard({ user }: { user: User }) {
  const driverDetails = user.driver_details;
  const currentOrders = mockOrders.filter(
    (o) => o.driverUid === user.uid && o.status !== 'delivered' && o.status !== 'cancelled'
  );

  if (!driverDetails) {
    return <div>تفاصيل المندوب غير متوفرة.</div>;
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="text-right">
          <h1 className="text-3xl font-bold">لوحة تحكم المندوب</h1>
          <p className="text-muted-foreground">مرحباً {user.full_name}, استعد لتوصيل الطلبات!</p>
        </div>
        <div className="flex items-center p-3 space-x-2 rounded-lg bg-card border">
          <Label htmlFor="online-status" className="font-semibold">الحالة</Label>
          <Switch id="online-status" checked={driverDetails.is_online} dir="ltr" />
          <span className={`font-semibold ${driverDetails.is_online ? 'text-green-600' : 'text-red-600'}`}>
            {driverDetails.is_online ? 'متصل' : 'غير متصل'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="رصيد المحفظة"
          value={`${driverDetails.wallet_balance.toFixed(2)} ر.س`}
          description="الرصيد القابل للسحب"
          Icon={DollarSign}
        />
        <StatsCard
          title="التقييم"
          value={driverDetails.rating.toString()}
          description="متوسط تقييمات العملاء"
          Icon={Star}
        />
        <StatsCard
          title="طلبات اليوم"
          value="0"
          description="+0 عن الأمس"
          Icon={Bike}
        />
        <StatsCard
          title="الحالة"
          value={driverDetails.status === 'approved' ? 'معتمد' : 'في الانتظار'}
          description="حالة حسابك"
          Icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SalesChart />
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>الطلبات الحالية</CardTitle>
            <Button variant="link" asChild>
            <Link href="/orders">
              عرض الكل <ArrowLeft className="w-4 h-4 mr-2" />
            </Link>
          </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentOrders.length > 0 ? (
                currentOrders.map((order) => <OrderListItem key={order.orderId} order={order} />)
              ) : (
                <p className="py-8 text-center text-muted-foreground">لا توجد طلبات حالية.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
