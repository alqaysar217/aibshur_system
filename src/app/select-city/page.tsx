'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { City } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const CitySkeleton = () => (
    <div className="space-y-2">
        {Array.from({length: 5}).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
        ))}
    </div>
)

export default function SelectCityPage() {
    const firestore = useFirestore();
    const { user, userData } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const { data: cities, loading: citiesLoading } = useCollection<City>(
        firestore ? collection(firestore, 'cities') : null
    );

    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    const handleCitySelection = async () => {
        if (!user || !selectedCityId || !firestore) return;
        setUpdating(true);
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, { city_id: selectedCityId });
            toast({ title: "تم تحديد المدينة بنجاح" });
            router.push('/');
        } catch (error: any) {
            console.error("Failed to update city: ", error);
            toast({ variant: 'destructive', title: "خطأ", description: "فشل تحديث المدينة." });
        } finally {
            setUpdating(false);
        }
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-right">
                <CardTitle>اختر مدينتك</CardTitle>
                <CardDescription>حدد المدينة التي تتواجد فيها لبدء استخدام أبشر.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {citiesLoading ? <CitySkeleton /> : (
                    <div className="space-y-2">
                        {cities?.map((city) => (
                            <Button
                                key={city.cityId}
                                variant={selectedCityId === city.cityId ? 'default' : 'outline'}
                                className="w-full justify-between"
                                onClick={() => setSelectedCityId(city.cityId)}
                            >
                                {city.name_ar}
                                {selectedCityId === city.cityId && <Check className="w-4 h-4" />}
                            </Button>
                        ))}
                         {cities?.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">
                                لا توجد مدن متاحة حاليًا. يرجى مراجعة المسؤول.
                            </p>
                        )}
                    </div>
                )}
                <Button 
                    onClick={handleCitySelection} 
                    disabled={!selectedCityId || updating || citiesLoading} 
                    className="w-full"
                >
                    {updating && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                    تأكيد ومتابعة
                </Button>
            </CardContent>
        </Card>
    )
}
