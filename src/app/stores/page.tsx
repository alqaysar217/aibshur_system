import StoreCard from '@/components/store/store-card';
import { Input } from '@/components/ui/input';
import { mockCategories, mockStores } from '@/lib/mock-data';
import { Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function StoresPage() {
  const availableStores = mockStores.filter((store) => store.is_open);

  return (
    <div className="space-y-8">
      <div className="text-right">
        <h1 className="text-3xl font-bold">استكشف المتاجر</h1>
        <p className="text-muted-foreground">ابحث عن مطاعمك وصيدلياتك وأسواقك المفضلة.</p>
      </div>

      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-4 -my-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="ابحث عن متجر..." className="pl-10 pr-4" />
        </div>

        <Tabs defaultValue="all" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">الكل</TabsTrigger>
            {mockCategories.map((cat) => (
              <TabsTrigger key={cat.filterId} value={cat.filterId}>
                {cat.name_ar}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {availableStores.map((store) => (
           <Link href={`/stores/${store.storeId}`} key={store.storeId}>
             <StoreCard store={store} />
           </Link>
        ))}
         {availableStores.length === 0 && (
            <p className="py-8 text-center text-muted-foreground col-span-full">لا توجد متاجر متاحة حالياً.</p>
         )}
      </div>
    </div>
  );
}
