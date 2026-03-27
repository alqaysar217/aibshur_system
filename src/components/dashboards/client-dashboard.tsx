import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, ShoppingBasket } from 'lucide-react';
import type { User } from '@/lib/types';
import { mockOrders } from '@/lib/mock-data';
import OrderListItem from '../order/order-list-item';
import AIRecommendations from '../ai/recommendations';

export default function ClientDashboard({ user }: { user: User }) {
  const recentOrders = mockOrders
    .filter((order) => order.clientUid === user.uid)
    .slice(0, 3);

  return (
    <div className="grid gap-8">
      <div className="text-right">
        <h1 className="text-3xl font-bold">أهلاً بك، {user.full_name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">ماذا تريد أن تطلب اليوم؟</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex flex-col justify-center text-center transition-transform bg-primary text-primary-foreground hover:scale-105">
          <CardContent className="p-6">
            <Link href="/stores" className="flex flex-col items-center gap-2">
              <ShoppingBasket className="w-10 h-10" />
              <p className="font-semibold">اطلب من متجر جديد</p>
            </Link>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-center text-center transition-transform hover:scale-105">
           <CardContent className="p-6">
            <button className="flex flex-col items-center w-full gap-2">
              <PlusCircle className="w-10 h-10" />
              <p className="font-semibold">إعادة طلب سابق</p>
            </button>
          </CardContent>
        </Card>
      </div>

      <AIRecommendations user={user} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>آخر الطلبات</CardTitle>
          <Button variant="link" asChild>
            <Link href="/orders">
              عرض الكل <ArrowLeft className="w-4 h-4 mr-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => <OrderListItem key={order.orderId} order={order} />)
            ) : (
              <p className="py-8 text-center text-muted-foreground">ليس لديك طلبات سابقة.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
