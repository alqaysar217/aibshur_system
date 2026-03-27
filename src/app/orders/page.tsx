import OrderListItem from '@/components/order/order-list-item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockOrders, mockUsers } from '@/lib/mock-data';
import type { OrderStatus } from '@/lib/types';

const orderStatuses: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'preparing', label: 'قيد التجهيز' },
  { value: 'out_for_delivery', label: 'جاري التوصيل' },
  { value: 'delivered', label: 'المكتملة' },
  { value: 'cancelled', label: 'الملغاة' },
];

export default function OrdersPage() {
  const currentUser = mockUsers[0]; // Assuming client user for this page
  const userOrders = mockOrders.filter((order) => order.client_uid === currentUser.uid);

  return (
    <div className="space-y-8">
      <div className="text-right">
        <h1 className="text-3xl font-bold">طلباتي</h1>
        <p className="text-muted-foreground">تتبع حالة طلباتك الحالية والسابقة.</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {orderStatuses.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {status.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {orderStatuses.map((statusInfo) => (
          <TabsContent key={statusInfo.value} value={statusInfo.value}>
            <div className="space-y-4">
              {userOrders
                .filter(
                  (order) => statusInfo.value === 'all' || order.status === statusInfo.value
                )
                .map((order) => (
                  <OrderListItem key={order.order_id} order={order} />
                ))}
              {userOrders.filter(
                (order) => statusInfo.value === 'all' || order.status === statusInfo.value
              ).length === 0 && (
                <div className="py-20 text-center text-muted-foreground">
                  <p>لا توجد طلبات في هذه الفئة.</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
