import { Card, CardContent } from '@/components/ui/card';
import type { Store } from '@/lib/types';
import { Clock, Star } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '../ui/badge';

interface StoreCardProps {
  store: Store;
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Card className="w-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
      <div className="relative">
        <Image
          data-ai-hint="store front"
          src={`https://picsum.photos/seed/${store.storeId}/400/200`}
          alt={store.name_ar}
          width={400}
          height={200}
          className="object-cover w-full h-32"
        />
        <div className="absolute bottom-0 right-0 flex items-center p-4">
          <Image
            data-ai-hint="store logo"
            src={store.logo_url}
            alt={`${store.name_ar} logo`}
            width={48}
            height={48}
            className="p-1 bg-white rounded-md shadow-md"
          />
        </div>
        {!store.is_open && (
           <Badge variant="destructive" className="absolute top-2 left-2">مغلق</Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg truncate">{store.name_ar}</h3>
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span>{store.rating.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
