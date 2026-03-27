import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Order } from '@/lib/types';
import { mockStores } from '@/lib/mock-data';
import { Badge } from '../ui/badge';
import OrderStatusStepper from './order-status-stepper';

interface OrderListItemProps {
  order: Order;
}

const getStatusVariant = (status: Order['status']) => {
  switch (status) {
    case 'delivered':
      return 'default';
    case 'cancelled':
      return 'destructive';
    case 'out_for_delivery':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function OrderListItem({ order }: OrderListItemProps) {
  const store = mockStores.find((s) => s.store_id === order.store_id);

  if (!store) return null;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex items-center flex-1 gap-4">
            <Image
              data-ai-hint="store logo"
              src={store.logo_url}
              alt={store.name_ar}
              width={64}
              height={64}
              className="rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-semibold">{store.name_ar}</h3>
              <p className="text-sm text-muted-foreground">
                طلب رقم #{order.order_id.slice(-6)}
              </p>
              <p className="text-sm font-bold">
                {(order.total_price + order.delivery_fee).toLocaleString('ar-SA', {
                  style: 'currency',
                  currency: 'SAR',
                })}
              </p>
            </div>
          </div>
          <div className="flex-1">
             <OrderStatusStepper currentStatus={order.status} />
          </div>

          <div className="flex items-center justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href={`/orders/${order.order_id}`}>
                <span>التفاصيل</span>
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
