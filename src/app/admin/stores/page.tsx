'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, GeoPoint, setDoc, getDocs } from 'firebase/firestore';
import type { Store, City, DailyHours, StoreCategory } from '@/lib/types';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, Store as StoreIcon, Plus, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { mockAdminUser } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';


const StoreRowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={4} className="p-0">
            <Skeleton className="w-full h-[60px]"/>
        </TableCell>
    </TableRow>
)

const initialSchedule: Record<string, DailyHours> = {
  saturday: { is_closed: false, slots: [{ open: '09:00', close: '22:00' }] },
  sunday: { is_closed: false, slots: [{ open: '09:00', close: '22:00' }] },
  monday: { is_closed: false, slots: [{ open: '09:00', close: '22:00' }] },
  tuesday: { is_closed: false, slots: [{ open: '09:00', close: '22:00' }] },
  wednesday: { is_closed: false, slots: [{ open: '09:00', close: '22:00' }] },
  thursday: { is_closed: true, slots: [] },
  friday: { is_closed: true, slots: [] },
};

const dayNames: Record<string, string> = {
    saturday: 'السبت',
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
};

export default function AdminStoresPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  const [stores, setStores] = useState<Store[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<Error | null>(null);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [currentStore, setCurrentStore] = useState<Partial<Store> | null>(null);
  const [schedule, setSchedule] = useState<Record<string, DailyHours>>(initialSchedule);
  const [logoPreview, setLogoPreview] = useState('');

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    if (!firestore) return;
    const fetchData = async () => {
        setLoading(true);
        setDbError(null);
        try {
            const [storesSnapshot, citiesSnapshot, categoriesSnapshot] = await Promise.all([
                getDocs(collection(firestore, 'stores')),
                getDocs(collection(firestore, 'cities')),
                getDocs(collection(firestore, 'store_categories')),
            ]);
            setStores(storesSnapshot.docs.map(d => ({...d.data(), id: d.id } as Store)));
            setCities(citiesSnapshot.docs.map(d => ({...d.data(), id: d.id } as City)));
            setStoreCategories(categoriesSnapshot.docs.map(d => ({...d.data(), id: d.id } as StoreCategory)));
        } catch (err: any) {
            setDbError(err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [firestore, refreshKey]);


  const handleOpenFormDialog = (store: Partial<Store> | null = null) => {
    if (store) {
      setCurrentStore({ ...store });
      setSchedule(store.working_hours || initialSchedule);
      setLogoPreview(store.logo_url || '');
    } else {
      setCurrentStore({ 
          working_hours: initialSchedule,
          is_active: true,
          is_open: true,
          rating: 4.5,
          ownerUid: mockAdminUser.uid,
          storeOwnerUid: mockAdminUser.uid,
          logo_url: '',
          location: { latitude: 0, longitude: 0 }
      });
      setSchedule(initialSchedule);
      setLogoPreview('');
    }
    setIsFormDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (store: Store) => {
    setStoreToDelete(store);
    setIsDeleteDialogOpen(true);
  };

  const handleScheduleChange = (day: string, field: 'is_closed' | 'open' | 'close', value: any, slotIndex?: number) => {
    setSchedule(prev => {
        const dayData = { ...(prev[day] || { is_closed: false, slots: [] }) };
        if (field === 'is_closed') {
            dayData.is_closed = value;
            if (value) {
                dayData.slots = [];
            } else if (dayData.slots.length === 0) {
                dayData.slots = [{ open: '09:00', close: '22:00' }];
            }
        } else if (slotIndex !== undefined && (field === 'open' || field === 'close')) {
            const newSlots = [...dayData.slots];
            newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
            dayData.slots = newSlots;
        }
        return { ...prev, [day]: dayData };
    });
  };

  const addSlot = (day: string) => {
    setSchedule(prev => {
        const dayData = prev[day];
        if (dayData.slots.length >= 2) return prev; // Max 2 slots
        const newSlots = [...dayData.slots, { open: '16:00', close: '23:00' }];
        return {
            ...prev,
            [day]: { ...dayData, slots: newSlots }
        };
    });
  }

  const removeSlot = (day: string, slotIndex: number) => {
     setSchedule(prev => {
        const dayData = prev[day];
        const newSlots = dayData.slots.filter((_, index) => index !== slotIndex);
        return {
            ...prev,
            [day]: { ...dayData, slots: newSlots }
        };
    });
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentStore) {
        toast({ variant: 'destructive', title: "خطأ", description: "بيانات النموذج غير جاهزة." });
        return;
    }
    setIsSubmitting(true);
    
    let docRef;

    try {
        const formData = new FormData(e.currentTarget);
        
        if (!currentStore.city_id) throw new Error("الرجاء اختيار مدينة صحيحة.");
        if (!currentStore.filter_ids || currentStore.filter_ids.length === 0) throw new Error("الرجاء اختيار فئة صحيحة.");
        
        const lat = currentStore.location?.latitude;
        const lon = currentStore.location?.longitude;

        if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
            throw new Error("الرجاء إدخال إحداثيات الموقع (خط العرض وخط الطول) كأرقام صالحة.");
        }

        const selectedCity = cities?.find(c => c.id === currentStore.city_id);
        if (!selectedCity) throw new Error("المدينة المختارة غير موجودة.");

        const storeDataObject: Partial<Store> = {
            ...currentStore,
            name_ar: formData.get('name_ar') as string,
            name_en: (formData.get('name_ar') as string).toLowerCase().replace(/ /g, '-'),
            logo_url: formData.get('logo_url') as string || 'https://picsum.photos/seed/default-logo/200/200',
            description_ar: currentStore.description_ar || 'متجر متخصص في كل ما هو جديد',
            description_en: currentStore.description_en || 'A store specializing in everything new',
            city_id: currentStore.city_id,
            filter_ids: currentStore.filter_ids,
            location: new GeoPoint(lat, lon),
            address_text: currentStore.address_text || `${selectedCity.name_ar} - بالقرب من...`,
            rating: parseFloat(formData.get('rating') as string) || 4.5,
            preparation_time: formData.get('preparation_time') as string,
            working_hours: schedule,
        };

        if (currentStore?.id) {
            docRef = doc(firestore, 'stores', currentStore.id);
            await updateDoc(docRef, storeDataObject);
            toast({ title: "تم تحديث المتجر بنجاح!" });
        } else {
            const storesCollection = collection(firestore, 'stores');
            docRef = doc(storesCollection);
            const newStoreData: Store = {
                ...(storeDataObject as Store),
                storeId: docRef.id
            };
            await setDoc(docRef, newStoreData);
            toast({ title: "تمت إضافة المتجر بنجاح!" });
        }

        setIsFormDialogOpen(false);
        setCurrentStore(null);
        handleRefresh();

    } catch (error: any) {
        console.error("Error saving store: ", error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: docRef!.path,
              operation: currentStore?.id ? 'update' : 'create',
              requestResourceData: currentStore
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: "حدث خطأ فادح", description: (error as Error).message || "لم يتم حفظ المتجر. يرجى مراجعة الكونسول." });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!storeToDelete || !firestore) return;
    const docRef = doc(firestore, 'stores', storeToDelete.id!);

    try {
        await deleteDoc(docRef);
        toast({ title: "تم الحذف", description: `تم حذف متجر "${storeToDelete.name_ar}" بنجاح.` });
        handleRefresh();
    } catch (error: any) {
        console.error("Error deleting store: ", error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: "خطأ في الحذف", description: "حدث خطأ أثناء محاولة الحذف." });
        }
    } finally {
        setIsDeleteDialogOpen(false);
        setStoreToDelete(null);
    }
  };
  
  const getCityName = (cityId: string) => {
    if (loading) return '...';
    return cities.find(c => c.id === cityId)?.name_ar || cityId;
  }

  if (dbError) {
    console.error("Error fetching data for stores page:", dbError);
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('Could not reach Firestore backend') || dbError.message.includes('permission-denied') || dbError.message.includes('Missing or insufficient permissions')) {
        return <SetupFirestoreMessage />;
    }
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
        <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")}/></Button>
            <Button onClick={() => handleOpenFormDialog()} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
            <PlusCircle className="w-4 h-4" />
            إضافة متجر جديد
            </Button>
        </div>
      </div>
      
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
         <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-primary" /> المتاجر المسجلة
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="px-6 py-4 text-center">اسم المتجر</TableHead>
                <TableHead className="px-6 py-4 text-center">المدينة</TableHead>
                <TableHead className="px-6 py-4 text-center">الحالة</TableHead>
                <TableHead className="px-6 py-4 text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {loading ? (
                 Array.from({length: 3}).map((_, i) => <StoreRowSkeleton key={i}/>)
              ) : stores && stores.length > 0 ? (
                stores.map((store) => (
                  <TableRow key={store.id} className="hover:bg-gray-50/50">
                    <TableCell className="px-6 py-4 font-bold text-xs text-gray-700 flex items-center justify-center gap-4">
                        <Image src={store.logo_url} alt={store.name_ar} width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100"/>
                        {store.name_ar}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-bold text-xs text-gray-400 text-center">{getCityName(store.city_id)}</TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <Badge className={cn(
                        "rounded-xl border-none font-black px-3 py-1 text-[9px]",
                        store.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {store.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 flex justify-center gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenFormDialog(store)}>
                        <Edit className="w-4 h-4 text-gray-400" />
                      </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleOpenDeleteDialog(store)}>
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

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-2xl">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader>
                <DialogTitle className="font-black text-gray-900">{currentStore?.id ? 'تعديل بيانات المتجر' : 'إضافة متجر احترافي جديد'}</DialogTitle>
                <DialogDescription className="font-bold text-gray-400">املأ كافة التفاصيل لمتجرك.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4 text-right max-h-[70vh] overflow-y-auto pr-2 pl-4">
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name_ar" className="font-bold text-gray-700">اسم المتجر</Label>
                        <Input id="name_ar" name="name_ar" required className="rounded-lg bg-gray-50" defaultValue={currentStore?.name_ar || ''} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo_url" className="font-bold text-gray-700">رابط شعار المتجر (Logo URL)</Label>
                        <Input id="logo_url" name="logo_url" type="text" placeholder="/images/logo.png أو https://..." className="rounded-lg bg-gray-50" dir="ltr" defaultValue={currentStore?.logo_url || ''} onChange={(e) => setLogoPreview(e.target.value)} />
                        {logoPreview && (logoPreview.startsWith('http') || logoPreview.startsWith('/')) && (
                            <div className="flex justify-center p-2 border rounded-xl bg-gray-50/50 mt-2">
                                <Image src={logoPreview} alt="معاينة الشعار" width={100} height={100} className="rounded-lg object-cover"/>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">الصق رابطاً مباشراً للصورة. سيتم استخدام شعار افتراضي إذا ترك فارغاً.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="city_id" className="font-bold text-gray-700">المحافظة</Label>
                            <select
                                id="city_id"
                                required
                                value={currentStore?.city_id || ''}
                                onChange={(e) => setCurrentStore(prev => ({...prev, city_id: e.target.value}))}
                                disabled={loading}
                                className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                                dir="rtl"
                            >
                                <option value="" disabled>اختر المحافظة</option>
                                {loading ? (
                                    <option disabled>جاري التحميل...</option>
                                ) : cities && cities.length > 0 ? (
                                    cities.map(city => <option key={city.id} value={city.id!}>{city.name_ar}</option>)
                                ) : (
                                    <option disabled>لا توجد مدن. أضف مدينة أولاً.</option>
                                )}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="filter_id" className="font-bold text-gray-700">نوع المتجر (الفئة)</Label>
                             <select
                                id="filter_id"
                                required
                                value={currentStore?.filter_ids?.[0] || ''}
                                onChange={(e) => setCurrentStore(prev => ({...prev, filter_ids: [e.target.value]}))}
                                disabled={loading}
                                className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                                dir="rtl"
                            >
                                <option value="" disabled>اختر الفئة</option>
                                {loading ? (
                                    <option disabled>جاري التحميل...</option>
                                ) : storeCategories && storeCategories.length > 0 ? (
                                    storeCategories.map(cat => <option key={cat.id} value={cat.id!}>{cat.name_ar}</option>)
                                ) : (
                                    <option disabled>لا توجد فئات. أضف فئة أولاً.</option>
                                )}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rating" className="font-bold text-gray-700">التقييم الأولي (من 5)</Label>
                            <Input id="rating" name="rating" type="number" step="0.1" min="0" max="5" required className="rounded-lg bg-gray-50" dir="ltr" defaultValue={currentStore?.rating || 4.5}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="preparation_time" className="font-bold text-gray-700">وقت التوصيل المتوقع</Label>
                            <Input id="preparation_time" name="preparation_time" required className="rounded-lg bg-gray-50" placeholder="مثال: 30-45 دقيقة" defaultValue={currentStore?.preparation_time || ''}/>
                        </div>
                    </div>
                    
                    <div className="md:col-span-2 space-y-2 p-4 border-2 border-dashed rounded-lg bg-gray-50/50">
                        <Label className="font-black text-gray-700">موقع المتجر على الخريطة</Label>
                        <p className="text-xs text-amber-600 font-bold bg-amber-50 p-2 rounded-md">ملاحظة: سيتم استبدال هذه الحقول بخريطة تفاعلية في المرحلة القادمة.</p>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="latitude">خط العرض (Latitude)</Label>
                                <Input
                                    id="latitude"
                                    name="latitude"
                                    type="number"
                                    step="any"
                                    required
                                    className="rounded-lg bg-gray-50"
                                    dir="ltr"
                                    placeholder="e.g. 15.3694"
                                    value={currentStore?.location?.latitude ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.valueAsNumber;
                                        setCurrentStore(prev => ({
                                            ...prev,
                                            location: {
                                                ...(prev?.location as GeoPoint),
                                                latitude: isNaN(value) ? prev?.location?.latitude ?? 0 : value,
                                            }
                                        }))
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longitude">خط الطول (Longitude)</Label>
                                <Input
                                    id="longitude"
                                    name="longitude"
                                    type="number"
                                    step="any"
                                    required
                                    className="rounded-lg bg-gray-50"
                                    dir="ltr"
                                    placeholder="e.g. 44.1910"
                                    value={currentStore?.location?.longitude ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.valueAsNumber;
                                        setCurrentStore(prev => ({
                                            ...prev,
                                            location: {
                                                ...(prev?.location as GeoPoint),
                                                longitude: isNaN(value) ? prev?.location?.longitude ?? 0 : value,
                                            }
                                        }))
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 border-r pr-8">
                     <Label className="font-bold text-gray-700 text-lg">ساعات العمل المتقدمة</Label>
                     <div className="space-y-3">
                        {Object.keys(dayNames).map(dayKey => (
                            <div key={dayKey} className="p-3 bg-gray-50 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="font-black text-primary">{dayNames[dayKey]}</Label>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`${dayKey}_closed`} className="text-xs font-bold text-red-500">مغلق</Label>
                                        <Switch id={`${dayKey}_closed`} checked={schedule[dayKey]?.is_closed ?? false} onCheckedChange={(checked) => handleScheduleChange(dayKey, 'is_closed', checked)} dir="ltr" />
                                    </div>
                                </div>
                                {!(schedule[dayKey]?.is_closed) && (
                                    <div className="space-y-2">
                                        {schedule[dayKey]?.slots.map((slot, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input type="time" value={slot.open} onChange={(e) => handleScheduleChange(dayKey, 'open', e.target.value, index)} className="rounded-lg" dir="ltr"/>
                                                <span className="font-bold text-gray-400">-</span>
                                                <Input type="time" value={slot.close} onChange={(e) => handleScheduleChange(dayKey, 'close', e.target.value, index)} className="rounded-lg" dir="ltr"/>
                                                {schedule[dayKey].slots.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeSlot(dayKey, index)}><X className="w-4 h-4" /></Button>}
                                            </div>
                                        ))}
                                        {schedule[dayKey]?.slots.length < 2 && <Button type="button" variant="outline" size="sm" className="text-xs font-bold gap-1" onClick={() => addSlot(dayKey)}><Plus className="w-3 h-3"/> إضافة فترة مسائية</Button>}
                                    </div>
                                )}
                            </div>
                        ))}
                     </div>
                </div>

            </div>
            <DialogFooter className="pt-4 border-t mt-4">
                <Button type="submit" disabled={isSubmitting || loading} className="rounded-lg font-black w-32">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : (currentStore?.id ? 'حفظ التعديلات' : 'حفظ المتجر')}
                </Button>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button>
                </DialogClose>
            </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>
                هذا الإجراء سيقوم بحذف متجر "{storeToDelete?.name_ar}" بشكل نهائي. لا يمكن التراجع عن هذا القرار.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                نعم، قم بالحذف
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
