'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, doc, GeoPoint } from 'firebase/firestore';
import type { Store, City } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, Store as StoreIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { mockCategories, mockAdminUser } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';

const StoreRowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={5} className="p-0">
            <Skeleton className="w-full h-[60px]"/>
        </TableCell>
    </TableRow>
)

export default function AdminStoresPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const storesQuery = useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(storesQuery);
  
  const citiesQuery = useMemo(() => firestore ? collection(firestore, 'cities') : null, [firestore]);
  const { data: cities, loading: citiesLoading, error: citiesError } = useCollection<City>(citiesQuery);


  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const lat = parseFloat(formData.get('latitude') as string);
    const lon = parseFloat(formData.get('longitude') as string);
    const selectedCityDocId = formData.get('city_id') as string;
    
    const selectedCity = cities?.find(c => c.id === selectedCityDocId);
    if (!selectedCity) {
        toast({ variant: 'destructive', title: "خطأ", description: "الرجاء اختيار مدينة صحيحة." });
        setIsSubmitting(false);
        return;
    }

    const newStoreData: Omit<Store, 'id' | 'storeId' | 'ownerUid' | 'storeOwnerUid'> = {
      name_ar: formData.get('name_ar') as string,
      logo_url: formData.get('logo_url') as string,
      city_id: selectedCity.cityId, // Save the city's custom ID, not Firestore's doc ID
      filter_ids: [formData.get('filter_id') as string],
      location: new GeoPoint(lat, lon),
      is_active: true,
      is_open: true,
      rating: 0,
    };

    // In a real app, ownerUid would come from the logged-in store owner
    const ownerUid = mockAdminUser.uid;

    try {
        const storeRef = collection(firestore, 'stores');
        const newDoc = await addDoc(storeRef, {
            ...newStoreData,
            storeId: '', // Will be updated with doc ID
            ownerUid,
            storeOwnerUid: ownerUid // Denormalized for security rules
        });

        // Now update the document with its own ID
        await doc(storeRef, newDoc.id).update({ storeId: newDoc.id });


        toast({ title: "تمت إضافة المتجر بنجاح!" });
        setShowAddForm(false);
        e.currentTarget.reset();

    } catch (error) {
        console.error("Error adding store: ", error);
        toast({ variant: 'destructive', title: "حدث خطأ", description: "لم يتم حفظ المتجر." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (storeId: string) => {
    toast({ variant: 'destructive', title: "الحذف معطل", description: "تم تعطيل هذه الميزة مؤقتاً." });
  };
  
  const getCityName = (cityId: string) => {
    return cities?.find(c => c.cityId === cityId)?.name_ar || 'غير محدد';
  }

  const combinedError = storesError || citiesError;
  if (combinedError) {
    return <SetupFirestoreMessage />;
  }
  if (!firestore) {
    return <SetupFirestoreMessage />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المتاجر</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إضافة وتعديل بيانات المتاجر المسجلة في النظام.</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle className="w-4 h-4" />
          {showAddForm ? 'إلغاء الإضافة' : 'إضافة متجر جديد'}
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-none shadow-sm rounded-[20px] bg-white overflow-hidden animate-in fade-in-50">
            <CardHeader>
                <CardTitle>نموذج إضافة متجر جديد</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name_ar">اسم المتجر</Label>
                            <Input id="name_ar" name="name_ar" required className="rounded-lg"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="logo_url">رابط شعار المتجر (Logo URL)</Label>
                            <Input id="logo_url" name="logo_url" type="url" required className="rounded-lg" dir="ltr" placeholder="https://example.com/logo.png"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="city_id">المدينة</Label>
                            <Select name="city_id" dir="rtl" required>
                                <SelectTrigger className="rounded-lg font-bold">
                                    <SelectValue placeholder="اختر المدينة" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    {citiesLoading ? <SelectItem value="loading" disabled>جاري التحميل...</SelectItem> 
                                    : cities?.map(city => (
                                    <SelectItem key={city.id} value={city.id!}>{city.name_ar}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="filter_id">نوع المتجر (الفئة)</Label>
                            <Select name="filter_id" dir="rtl" required>
                                <SelectTrigger className="rounded-lg font-bold">
                                    <SelectValue placeholder="اختر الفئة" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    {mockCategories.map(cat => (
                                    <SelectItem key={cat.filterId} value={cat.filterId}>{cat.name_ar}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="latitude">خط العرض (Latitude)</Label>
                            <Input id="latitude" name="latitude" type="number" step="any" required className="rounded-lg" dir="ltr"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="longitude">خط الطول (Longitude)</Label>
                            <Input id="longitude" name="longitude" type="number" step="any" required className="rounded-lg" dir="ltr"/>
                        </div>
                    </div>
                     <div className="flex justify-end gap-4 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)} className="rounded-lg font-bold">إلغاء</Button>
                        <Button type="submit" disabled={isSubmitting || citiesLoading} className="rounded-lg font-black">
                            {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin"/>}
                            حفظ المتجر
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm rounded-[20px] bg-white overflow-hidden">
         <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-primary" /> المتاجر المسجلة
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="px-6 py-4 text-right">اسم المتجر</TableHead>
                <TableHead className="px-6 py-4">المدينة</TableHead>
                <TableHead className="px-6 py-4">الحالة</TableHead>
                <TableHead className="px-6 py-4 text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {storesLoading ? (
                 Array.from({length: 3}).map((_, i) => <StoreRowSkeleton key={i}/>)
              ) : stores && stores.length > 0 ? (
                stores.map((store) => (
                  <TableRow key={store.id} className="hover:bg-gray-50/50">
                    <TableCell className="px-6 py-4 font-bold text-xs text-gray-700 flex items-center gap-2">
                        <img src={store.logo_url} alt={store.name_ar} className="w-8 h-8 rounded-md object-cover"/>
                        {store.name_ar}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-bold text-xs text-gray-400">{getCityName(store.city_id)}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge className={cn(
                        "rounded-xl border-none font-black px-3 py-1 text-[9px]",
                        store.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {store.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 flex justify-center gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <Edit className="w-4 h-4 text-gray-400" />
                      </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(store.id!)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-gray-400 font-bold">
                    <p>لا توجد متاجر مضافة بعد. قم بإضافة متجرك الأول.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
