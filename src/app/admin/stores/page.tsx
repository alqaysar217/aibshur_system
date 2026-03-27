'use client';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, GeoPoint } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '@/firebase/config';
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
import { PlusCircle, Edit, Trash2, Loader2, Store as StoreIcon, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { mockCategories, mockAdminUser } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import Image from 'next/image';

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
  const storage = useMemo(() => firebaseApp ? getStorage(firebaseApp) : null, []);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !storage) return;
    setIsSubmitting(true);
    setUploadProgress(0);

    let logoUrl = 'https://picsum.photos/seed/default-logo/200/200'; // Default logo

    try {
        // Step 1: Upload image if selected
        if (logoFile) {
            const storageRef = ref(storage, `store-logos/${Date.now()}_${logoFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, logoFile);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        console.error("Upload failed:", error);
                        reject(error);
                    },
                    async () => {
                        logoUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });
        }

        // Step 2: Prepare Firestore document
        const formData = new FormData(e.currentTarget);
        const lat = parseFloat(formData.get('latitude') as string);
        const lon = parseFloat(formData.get('longitude') as string);
        const selectedCityDocId = formData.get('city_id') as string;
        
        const selectedCity = cities?.find(c => c.id === selectedCityDocId);
        if (!selectedCity) {
            throw new Error("الرجاء اختيار مدينة صحيحة.");
        }

        const newStoreData: Omit<Store, 'id' | 'storeId' | 'ownerUid' | 'storeOwnerUid'> = {
            name_ar: formData.get('name_ar') as string,
            logo_url: logoUrl,
            city_id: selectedCity.cityId, // Save the city's custom ID
            filter_ids: [formData.get('filter_id') as string],
            location: new GeoPoint(lat, lon),
            rating: parseFloat(formData.get('rating') as string) || 0,
            preparation_time: formData.get('preparation_time') as string,
            working_hours: {
                "default": {
                    open: formData.get('working_hours_open') as string,
                    close: formData.get('working_hours_close') as string,
                    is_closed: false,
                }
            },
            is_active: true,
            is_open: true,
        };

        const ownerUid = mockAdminUser.uid; // Using mock user as per instructions

        // Step 3: Add to Firestore
        const storeRef = collection(firestore, 'stores');
        const newDoc = await addDoc(storeRef, {
            ...newStoreData,
            storeId: '', // placeholder
            ownerUid,
            storeOwnerUid: ownerUid // Denormalized for security rules
        });

        // Step 4: Update with its own ID
        await updateDoc(doc(storeRef, newDoc.id), { storeId: newDoc.id });

        toast({ title: "تمت إضافة المتجر بنجاح!" });
        setIsDialogOpen(false);
        setLogoFile(null);

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
        <DialogContent className="sm:max-w-2xl rounded-lg">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader className="text-right">
                <DialogTitle className="font-black text-gray-900">إضافة متجر احترافي جديد</DialogTitle>
                <DialogDescription className="font-bold text-gray-400">املأ كافة التفاصيل لمتجرك الجديد.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 text-right max-h-[70vh] overflow-y-auto pr-2 pl-4">
                
                {/* Basic Info */}
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="name_ar" className="font-bold text-gray-700">اسم المتجر</Label>
                    <Input id="name_ar" name="name_ar" required className="rounded-lg" />
                </div>
                
                {/* Logo Upload */}
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="logo_file" className="font-bold text-gray-700">شعار المتجر (Logo)</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                            {logoPreview ? 
                                <Image src={logoPreview} alt="preview" width={96} height={96} className="w-full h-full object-contain rounded-md"/> : 
                                <Upload className="w-8 h-8 text-gray-400" />
                            }
                        </div>
                        <Input id="logo_file" name="logo_file" type="file" onChange={handleFileChange} accept="image/*" className="rounded-lg file:font-black file:rounded-lg file:border-none file:bg-gray-100 file:text-primary"/>
                    </div>
                     {isSubmitting && uploadProgress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    )}
                </div>

                {/* City and Type */}
                <div className="space-y-2">
                    <Label htmlFor="city_id" className="font-bold text-gray-700">المحافظة</Label>
                    <Select name="city_id" dir="rtl" required>
                        <SelectTrigger className="rounded-lg font-bold">
                            <SelectValue placeholder="اختر المحافظة" />
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
                    <Label htmlFor="filter_id" className="font-bold text-gray-700">نوع المتجر (الفئة)</Label>
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
                
                {/* Rating and Prep Time */}
                 <div className="space-y-2">
                    <Label htmlFor="rating" className="font-bold text-gray-700">التقييم الأولي (من 5)</Label>
                    <Input id="rating" name="rating" type="number" step="0.1" min="0" max="5" required className="rounded-lg" dir="ltr" defaultValue="4.5"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="preparation_time" className="font-bold text-gray-700">وقت تجهيز الطلب</Label>
                    <Input id="preparation_time" name="preparation_time" required className="rounded-lg" placeholder="مثال: 20-30 دقيقة"/>
                </div>
                
                {/* Working Hours */}
                <div className="space-y-2">
                    <Label htmlFor="working_hours_open" className="font-bold text-gray-700">وقت الفتح</Label>
                    <Input id="working_hours_open" name="working_hours_open" type="time" required className="rounded-lg" dir="ltr" defaultValue="09:00"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="working_hours_close" className="font-bold text-gray-700">وقت الإغلاق</Label>
                    <Input id="working_hours_close" name="working_hours_close" type="time" required className="rounded-lg" dir="ltr" defaultValue="23:00"/>
                </div>

                {/* Map/Coordinates */}
                <div className="md:col-span-2 space-y-2 p-4 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <Label className="font-black text-gray-700">موقع المتجر على الخريطة</Label>
                    <p className="text-xs text-amber-600 font-bold bg-amber-50 p-2 rounded-md">ملاحظة: سيتم استبدال الحقول التالية بخريطة تفاعلية في المرحلة القادمة بعد تثبيت مكتبة الخرائط.</p>
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
            <DialogFooter className="flex-row-reverse pt-4 border-t">
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
