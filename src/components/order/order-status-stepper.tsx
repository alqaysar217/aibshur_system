'use client';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import { Check, Hourglass, ChefHat, Truck } from 'lucide-react';

const statuses: {
  id: OrderStatus;
  name: string;
  Icon: React.ElementType;
}[] = [
  { id: 'pending', name: 'قيد الانتظار', Icon: Hourglass },
  { id: 'preparing', name: 'قيد التجهيز', Icon: ChefHat },
  { id: 'out_for_delivery', name: 'جاري التوصيل', Icon: Truck },
  { id: 'delivered', name: 'تم التوصيل', Icon: Check },
];

export default function OrderStatusStepper({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentIndex = statuses.findIndex((s) => s.id === currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  if (isCancelled) {
    return (
        <div className="text-center text-destructive font-semibold p-2 rounded-md bg-destructive/10">
            تم إلغاء الطلب
        </div>
    )
  }

  return (
    <div className="flex items-center justify-between w-full" aria-label="Order status">
      {statuses.map(({ id, name, Icon }, i) => {
        const isActive = i <= currentIndex;
        return (
          <div key={id} className="flex flex-col items-center flex-1 text-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2',
                isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-muted-foreground/20 text-muted-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <p className={cn('text-xs mt-1', isActive ? 'font-semibold text-primary' : 'text-muted-foreground')}>
              {name}
            </p>
          </div>
        );
      })}
    </div>
  );
}
