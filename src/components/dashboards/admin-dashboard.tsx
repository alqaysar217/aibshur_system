import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, ShoppingBag, Activity } from 'lucide-react';
import type { User } from '@/lib/types';
import StatsCard from './stats-card';
import SalesChart from './sales-chart';
import { mockOrders, mockStores, mockUsers } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function AdminDashboard({ user }: { user: User }) {
  const totalRevenue = mockOrders.reduce((sum, order) => sum + order.total_price, 0);
  const totalUsers = mockUsers.length;
  const totalStores = mockStores.length;
  const totalOrders = mockOrders.length;
  
  const recentActivity = [
    { user: mockUsers[0], action: "قدم طلبًا جديدًا", time: "قبل 5 دقائق" },
    { user: mockUsers[1], action: "أصبح متصلاً", time: "قبل 12 دقيقة" },
    { user: mockUsers[2], action: "أضاف متجرًا جديدًا", time: "قبل ساعة" },
  ];

  return (
    <div className="grid gap-8">
      <div className="text-right">
        <h1 className="text-3xl font-bold">لوحة تحكم المدير</h1>
        <p className="text-muted-foreground">نظرة عامة على نظام أبشر.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="إجمالي الإيرادات"
          value={`${totalRevenue.toLocaleString('ar-SA')} ر.س`}
          description="+20.1% عن الشهر الماضي"
          Icon={DollarSign}
        />
        <StatsCard
          title="المستخدمون"
          value={`+${totalUsers}`}
          description="إجمالي المستخدمين المسجلين"
          Icon={Users}
        />
        <StatsCard
          title="المتاجر"
          value={`+${totalStores}`}
          description="إجمالي المتاجر النشطة"
          Icon={ShoppingBag}
        />
        <StatsCard
          title="الطلبات"
          value={`+${totalOrders}`}
          description="+180.1% عن الشهر الماضي"
          Icon={Activity}
        />
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesChart />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>آخر النشاطات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={activity.user.profile_image} />
                  <AvatarFallback>{activity.user.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none">
                    <span className="font-bold">{activity.user.full_name}</span> {activity.action}
                  </p>
                  <p className="text-sm text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
