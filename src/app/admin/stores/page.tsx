'use client';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, GeoPoint, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '@/firebase/config';
import type { Store, City, DailyHours } from '@/lib/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, Store as StoreIcon, Upload, Clock, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { mockCategories, mockAdminUser } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';

const StoreRowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={5} className="p-0">
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
  const storage = useMemo(() => firebaseApp ? getStorage(firebaseApp) : null, []);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [schedule, setSchedule] = useState(initialSchedule);


  const storesQuery = useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(storesQuery);
  
  const citiesQuery = useMemo(() => firestore ? collection(firestore, 'cities') : null, [firestore]);
  const { data: cities, loading: citiesLoading, error: citiesError } = useCollection<City>(citiesQuery);

  useEffect(() => {
    if (logoFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(logoFile);
    } else {
        setLogoPreview(null);
    }
  }, [logoFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setLogoFile(e.target.files[0]);
    }
  }

  const handleScheduleChange = (day: string, field: string, value: any, slotIndex?: number) => {
    setSchedule(prev => {
        const newDayData = { ...prev[day] };
        if (field === 'is_closed') {
            newDayData.is_closed = value;
            if (value) newDayData.slots = [];
            else newDayData.slots = [{ open: '09:00', close: '22:00' }];
        } else if (slotIndex !== undefined) {
            newDayData.slots[slotIndex] = { ...newDayData.slots[slotIndex], [field]: value };
        }
        return { ...prev, [day]: newDayData };
    });
  };

  const addSlot = (day: string) => {
    handleScheduleChange(day, 'slots', [...schedule[day].slots, { open: '16:00', close: '23:00' }]);
  }

  const removeSlot = (day: string, slotIndex: number) => {
    const newSlots = [...schedule[day].slots];
    newSlots.splice(slotIndex, 1);
    handleScheduleChange(day, 'slots', newSlots);
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !storage) return;
    setIsSubmitting(true);
    setUploadProgress(0);

    let logoUrl = 'https://picsum.photos/seed/default-logo/200/200'; // Default logo

    try {
        if (logoFile) {
            await new Promise<void>((resolve, reject) => {
                const storageRef = ref(storage, `store-logos/${Date.now()}_${logoFile.name}`);
                const uploadTask = uploadBytesResumable(storageRef, logoFile);
                uploadTask.on('state_changed',
                    (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                    (error) => reject(new Error(`فشل رفع الصورة: ${error.message}`)),
                    async () => {
                        logoUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });
        }
        
        const formData = new FormData(e.currentTarget);
        const lat = parseFloat(formData.get('latitude') as string);
        const lon = parseFloat(formData.get('longitude') as string);
        const selectedCityDocId = formData.get('city_id') as string;
        
        const selectedCity = cities?.find(c => c.id === selectedCityDocId);
        if (!selectedCity) throw new Error("الرجاء اختيار مدينة صحيحة.");
        if (isNaN(lat) || isNaN(lon)) throw new Error("إحداثيات الموقع غير صحيحة.");

        const newStoreData: Omit<Store, 'id' | 'storeId' | 'ownerUid' | 'storeOwnerUid'> = {
            name_ar: formData.get('name_ar') as string,
            logo_url: logoUrl,
            city_id: selectedCity.cityId,
            filter_ids: [formData.get('filter_id') as string],
            location: new GeoPoint(lat, lon),
            rating: parseFloat(formData.get('rating') as string) || 0,
            preparation_time: formData.get('preparation_time') as string,
            working_hours: schedule,
            is_active: true,
            is_open: true,
        };

        const ownerUid = mockAdminUser.uid;
        const storeRef = collection(firestore, 'stores');
        const newDoc = await addDoc(storeRef, {
            ...newStoreData,
            storeId: '',
            ownerUid,
            storeOwnerUid: ownerUid
        });

        await updateDoc(doc(storeRef, newDoc.id), { storeId: newDoc.id });

        toast({ title: "تمت إضافة المتجر بنجاح!" });
        setIsDialogOpen(false);
        setLogoFile(null);
        setSchedule(initialSchedule);

    } catch (error) {
        console.error("Error adding store: ", error);
        toast({ variant: 'destructive', title: "حدث خطأ", description: (error as Error).message || "لم يتم حفظ المتجر." });
    } finally {
        setIsSubmitting(false);
        setUploadProgress(0);
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
    if (combinedError.message.includes('database (default) does not exist')) {
        return <SetupFirestoreMessage />;
    }
    return <div className="text-destructive text-center">خطأ: {combinedError.message}</div>;
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
        <Button onClick={() => setIsDialogOpen(true)} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle className="w-4 h-4" />
          إضافة متجر جديد
        </Button>
      </div>
      
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
                    <TableCell className="px-6 py-4 font-bold text-xs text-gray-700 flex items-center gap-4">
                        <Image src={store.logo_url} alt={store.name_ar} width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100"/>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-lg">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader className="text-right">
                <DialogTitle className="font-black text-gray-900">إضافة متجر احترافي جديد</DialogTitle>
                <DialogDescription className="font-bold text-gray-400">املأ كافة التفاصيل لمتجرك الجديد.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4 text-right max-h-[70vh] overflow-y-auto pr-2 pl-4">
                
                {/* Right Column: Basic Info */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name_ar" className="font-bold text-gray-700">اسم المتجر</Label>
                        <Input id="name_ar" name="name_ar" required className="rounded-lg" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo_file" className="font-bold text-gray-700">شعار المتجر (Logo)</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                {logoPreview ? <Image src={logoPreview} alt="preview" width={96} height={96} className="w-full h-full object-contain rounded-md"/> : <Upload className="w-8 h-8 text-gray-400" />}
                            </div>
                            <Input id="logo_file" name="logo_file" type="file" onChange={handleFileChange} accept="image/*" className="rounded-lg file:font-black file:rounded-lg file:border-none file:bg-gray-100 file:text-primary"/>
                        </div>
                        {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="city_id" className="font-bold text-gray-700">المحافظة</Label>
                            <Select name="city_id" dir="rtl" required>
                                <SelectTrigger className="rounded-lg font-bold"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    {citiesLoading ? <SelectItem value="loading" disabled>جاري التحميل...</SelectItem> 
                                    : cities?.map(city => <SelectItem key={city.id} value={city.id!}>{city.name_ar}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="filter_id" className="font-bold text-gray-700">نوع المتجر (الفئة)</Label>
                            <Select name="filter_id" dir="rtl" required>
                                <SelectTrigger className="rounded-lg font-bold"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    {mockCategories.map(cat => <SelectItem key={cat.filterId} value={cat.filterId}>{cat.name_ar}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rating" className="font-bold text-gray-700">التقييم الأولي (من 5)</Label>
                            <Input id="rating" name="rating" type="number" step="0.1" min="0" max="5" required className="rounded-lg" dir="ltr" defaultValue="4.5"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="preparation_time" className="font-bold text-gray-700">وقت التوصيل المتوقع</Label>
                            <Input id="preparation_time" name="preparation_time" required className="rounded-lg" placeholder="مثال: 30-45 دقيقة"/>
                        </div>
                    </div>
                    
                    <div className="md:col-span-2 space-y-2 p-4 border-2 border-dashed rounded-lg bg-gray-50/50">
                        <Label className="font-black text-gray-700">موقع المتجر على الخريطة</Label>
                        <p className="text-xs text-amber-600 font-bold bg-amber-50 p-2 rounded-md">ملاحظة: سيتم استبدال هذه الحقول بخريطة تفاعلية في المرحلة القادمة بعد تثبيت مكتبة الخرائط (مثل Leaflet أو Google Maps).</p>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="latitude">خط العرض (Latitude)</Label>
                                <Input id="latitude" name="latitude" type="number" step="any" required className="rounded-lg" dir="ltr" placeholder="e.g. 15.3694"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longitude">خط الطول (Longitude)</Label>
                                <Input id="longitude" name="longitude" type="number" step="any" required className="rounded-lg" dir="ltr" placeholder="e.g. 44.1910"/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left Column: Working Hours */}
                <div className="space-y-4 border-r pr-8">
                     <Label className="font-bold text-gray-700 text-lg">ساعات العمل المتقدمة</Label>
                     <div className="space-y-3">
                        {Object.keys(dayNames).map(dayKey => (
                            <div key={dayKey} className="p-3 bg-gray-50 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="font-black text-primary">{dayNames[dayKey]}</Label>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`${dayKey}_closed`} className="text-xs font-bold text-red-500">مغلق</Label>
                                        <Switch id={`${dayKey}_closed`} checked={schedule[dayKey].is_closed} onCheckedChange={(checked) => handleScheduleChange(dayKey, 'is_closed', checked)} dir="ltr" />
                                    </div>
                                </div>
                                {!schedule[dayKey].is_closed && (
                                    <div className="space-y-2">
                                        {schedule[dayKey].slots.map((slot, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input type="time" name={`${dayKey}_open_${index}`} value={slot.open} onChange={(e) => handleScheduleChange(dayKey, 'open', e.target.value, index)} className="rounded-lg" dir="ltr"/>
                                                <span className="font-bold text-gray-400">-</span>
                                                <Input type="time" name={`${dayKey}_close_${index}`} value={slot.close} onChange={(e) => handleScheduleChange(dayKey, 'close', e.target.value, index)} className="rounded-lg" dir="ltr"/>
                                                {index > 0 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeSlot(dayKey, index)}><X className="w-4 h-4" /></Button>}
                                            </div>
                                        ))}
                                        {schedule[dayKey].slots.length < 2 && <Button type="button" variant="outline" size="sm" className="text-xs font-bold gap-1" onClick={() => addSlot(dayKey)}><Plus className="w-3 h-3"/> إضافة فترة مسائية</Button>}
                                    </div>
                                )}
                            </div>
                        ))}
                     </div>
                </div>

            </div>
            <DialogFooter className="flex-row-reverse pt-4 border-t mt-4">
                <Button type="submit" disabled={isSubmitting || citiesLoading} className="rounded-lg font-black w-32">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'حفظ المتجر'}
                </Button>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button>
                </DialogClose>
            </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
