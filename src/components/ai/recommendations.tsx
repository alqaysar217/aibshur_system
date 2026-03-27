'use client';
import type { User, Store, Product } from '@/lib/types';
import { useEffect, useState } from 'react';
import { clientPersonalizedRecommendations, type ClientPersonalizedRecommendationsOutput } from '@/ai/flows/client-personalized-recommendations';
import { mockOrders, mockProducts, mockStores } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { BrainCircuit, RefreshCw } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

const RecommendationsSkeleton = () => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-4" />
      </div>
    ))}
  </div>
);

export default function AIRecommendations({ user }: { user: User }) {
  const [recommendations, setRecommendations] = useState<ClientPersonalizedRecommendationsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRecs = async () => {
    setLoading(true);
    setError(null);
    try {
      const input = {
        clientUid: user.uid,
        currentCityId: user.city_id,
        clientPastOrderStoreIds: mockOrders
          .filter(o => o.client_uid === user.uid)
          .map(o => o.store_id),
        clientPastOrderProductIds: mockOrders
          .filter(o => o.client_uid === user.uid)
          .flatMap(o => o.items.map(item => item.product_id)),
        clientBrowsedStoreIds: ['store2'], // Mocked
        clientBrowsedProductIds: ['prod3'], // Mocked
        allAvailableStoresInCity: mockStores
          .filter(s => s.city_id === user.city_id)
          .map(s => ({
            store_id: s.store_id,
            name_ar: s.name_ar,
            filter_id: s.filter_id,
            rating: s.rating,
            logo_url: s.logo_url,
            address_text: s.address_text,
          })),
        allAvailableProductsInCity: mockProducts
          .filter(p => mockStores.find(s => s.store_id === p.store_id && s.city_id === user.city_id))
          .map(p => ({
            product_id: p.product_id,
            name_ar: p.name_ar,
            store_id: p.store_id,
            category_id: p.category_id,
            base_price: p.base_price,
            main_image: p.main_image,
          })),
      };
      const result = await clientPersonalizedRecommendations(input);
      setRecommendations(result);
    } catch (e) {
      console.error(e);
      setError('حدث خطأ أثناء جلب التوصيات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRecs();
  }, [user.uid, user.city_id]);

  const recommendedStoreDetails = recommendations?.recommendedStores.map(rec => {
    const store = mockStores.find(s => s.store_id === rec.store_id);
    return { ...rec, ...store };
  }).filter(Boolean) as (ClientPersonalizedRecommendationsOutput['recommendedStores'][0] & Store)[];
  
  const recommendedProductDetails = recommendations?.recommendedProducts.map(rec => {
      const product = mockProducts.find(p => p.product_id === rec.product_id);
      return {...rec, ...product};
  }).filter(Boolean) as (ClientPersonalizedRecommendationsOutput['recommendedProducts'][0] & Product)[];

  return (
    <Card className="bg-primary/5">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-primary" />
            <span>مقترح خصيصاً لك</span>
          </CardTitle>
          <CardDescription>توصيات ذكية بناءً على طلباتك السابقة.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={getRecs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <RecommendationsSkeleton />
        ) : error ? (
          <p className="text-center text-destructive">{error}</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold">متاجر قد تعجبك</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {recommendedStoreDetails?.map((item) => (
                  <Card key={item.store_id} className="overflow-hidden transition-all hover:shadow-lg">
                    <Image data-ai-hint="store logo" src={item.logo_url} alt={item.name_ar} width={200} height={200} className="object-cover w-full h-24" />
                    <div className="p-3">
                      <h4 className="font-semibold truncate">{item.name_ar}</h4>
                      <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-lg font-semibold">منتجات مقترحة</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {recommendedProductDetails?.map((item) => (
                  <Card key={item.product_id} className="overflow-hidden transition-all hover:shadow-lg">
                    <Image data-ai-hint="product photo" src={item.main_image} alt={item.name_ar} width={400} height={300} className="object-cover w-full h-24" />
                     <div className="p-3">
                      <h4 className="font-semibold truncate">{item.name_ar}</h4>
                      <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
