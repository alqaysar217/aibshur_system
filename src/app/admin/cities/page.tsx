'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import type { City } from '@/lib/types';
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
import { PlusCircle, Edit, Trash2, Loader2, Building2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';

const CityRowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={6} className="p-0">
            <Skeleton className="w-full h-[60px]"/>
        </TableCell>
    </TableRow>
)

const initialCities: Omit<City, 'id'>[] = [
    { cityId: 'mukalla', name_ar: 'المكلا', name_en: 'Al Mukalla', country_code: 'YE', is_active: true, support_number: '777000001' },
    { cityId: 'aden', name_ar: 'عدن', name_en: 'Aden', country_code: 'YE', is_active: true, support_number: '777000002' },
    { cityId: 'sanaa', name_ar: 'صنعاء', name_en: 'Sana\'a', country_code: 'YE', is_active: true, support_number: '777000003' },
    { cityId: 'taiz', name_ar: 'تعز', name_en: 'Taiz', country_code: 'YE', is_active: true, support_number: '777000004' },
    { cityId: 'sayun', name_ar: 'سيئون', name_en: 'Say\'un', country_code: 'YE', is_active: true, support_number: '777000005' },
];

export default function AdminCitiesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const citiesQuery = useMemo(() => firestore ? collection(firestore, 'cities') : null, [firestore]);
  const { data: cities, loading: citiesLoading, error } = useCollection<City>(citiesQuery);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [currentCity, setCurrentCity] = useState<Partial<City> | null>(null);
  const [isCityActive, setIsCityActive] = useState(true);

  const handleOpenDialog = (city: Partial<City> | null = null) => {
    setCurrentCity(city);
    setIsCityActive(city?.is_active ?? true);
    setDialogOpen(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const nameEn = formData.get('name_en') as string;
    const cityId = currentCity?.cityId || nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/--+/g, '-');

    const cityData: Omit<City, 'id'> = {
      cityId: cityId,
      name_ar: formData.get('name_ar') as string,
      name_en: nameEn,
      country_code: formData.get('country_code') as string,
      support_number: formData.get('support_number') as string,
      is_active: isCityActive,
    };

    try {
      if (currentCity?.id) {
        const cityDocRef = doc(firestore, 'cities', currentCity.id);
        await updateDoc(cityDocRef, cityData);
        toast({ title: "تم التحديث بنجاح", description: `تم تحديث بيانات مدينة ${cityData.name_ar}.` });
      } else {
        await addDoc(collection(firestore, 'cities'), cityData);
        toast({ title: "تمت الإضافة بنجاح", description: `تمت إضافة مدينة ${cityData.name_ar} إلى النظام.` });
      }
      setDialogOpen(false);
      setCurrentCity(null);
    } catch (error) {
      console.error("Error saving city: ", error);
      toast({ variant: 'destructive', title: "حدث خطأ", description: "لم يتم حفظ البيانات، يرجى المحاولة مرة أخرى." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cityDocId: string) => {
    if (!firestore) return;
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه المدينة؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            await deleteDoc(doc(firestore, 'cities', cityDocId));
            toast({ title: "تم الحذف", description: "تم حذف المدينة بنجاح." });
        } catch (error) {
            console.error("Error deleting city: ", error);
            toast({ variant: 'destructive', title: "خطأ في الحذف", description: "لم يتم حذف المدينة." });
        }
    }
  }

  const handleSeedCities = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
        const batch = writeBatch(firestore);
        const citiesCol = collection(firestore, 'cities');

        initialCities.forEach(cityData => {
            const docRef = doc(citiesCol, cityData.cityId); // Use cityId as document ID for predictability
            batch.set(docRef, cityData);
        });

        await batch.commit();
        toast({ title: "نجاح", description: "تمت إضافة المدن الأساسية إلى قاعدة البيانات." });
    } catch (error) {
        console.error("Error seeding cities:", error);
        toast({ variant: 'destructive', title: "خطأ", description: "فشلت عملية إضافة المدن." });
    } finally {
        setIsSeeding(false);
    }
  }


  if (error) {
    return <SetupFirestoreMessage />;
  }

  if (!firestore) {
    return <SetupFirestoreMessage />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المدن والمحافظات</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إضافة وتعديل وحذف المدن التي يغطيها تطبيق أبشر.</p>
        </div>
        <div className="flex gap-2">
            {!citiesLoading && cities?.length === 0 && (
                <Button onClick={handleSeedCities} disabled={isSeeding} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20 bg-emerald-500 hover:bg-emerald-600">
                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    إضافة المدن الأساسية (للمرة الأولى)
                </Button>
            )}
            <Button onClick={() => handleOpenDialog({is_active: true})} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
            <PlusCircle className="w-4 h-4" />
            إضافة مدينة جديدة
            </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-[20px] bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> المدن المتاحة
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="px-6 py-4 text-center">الاسم (العربية)</TableHead>
                <TableHead className="px-6 py-4 text-center">الاسم (الإنجليزية)</TableHead>
                <TableHead className="px-6 py-4 text-center">رقم الدعم</TableHead>
                <TableHead className="px-6 py-4 text-center">رمز الدولة</TableHead>
                <TableHead className="px-6 py-4 text-center">الحالة</TableHead>
                <TableHead className="px-6 py-4 text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {citiesLoading ? (
                Array.from({length: 4}).map((_, i) => <CityRowSkeleton key={i}/>)
              ) : cities && cities.map((city) => (
                <TableRow key={city.id} className="hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4 font-bold text-xs text-gray-700 text-center">{city.name_ar}</TableCell>
                  <TableCell className="px-6 py-4 font-bold text-xs text-gray-400 text-center">{city.name_en}</TableCell>
                  <TableCell className="px-6 py-4 font-bold text-xs text-gray-700 text-center" dir="ltr">{city.support_number}</TableCell>
                  <TableCell className="px-6 py-4 font-bold text-xs text-gray-700 text-center">{city.country_code}</TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Badge className={cn(
                        "rounded-xl border-none font-black px-3 py-1 text-[9px]",
                        city.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                        {city.is_active ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 flex justify-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(city)}>
                      <Edit className="w-4 h-4 text-gray-400" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(city.id!)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {!citiesLoading && cities?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-gray-400 font-bold">
                    <p>لا توجد مدن معرفة بعد. قم بإضافة المدن الأساسية أو أضف مدينة جديدة.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader className="text-right">
                <DialogTitle className="font-black text-gray-900">{currentCity?.id ? 'تعديل مدينة' : 'إضافة مدينة جديدة'}</DialogTitle>
                <DialogDescription className="font-bold text-gray-400">املأ التفاصيل أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
                <div className="space-y-2">
                    <Label htmlFor="name_ar" className="font-bold text-gray-700">الاسم (العربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={currentCity?.name_ar || ''} required className="rounded-lg bg-gray-50" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="name_en" className="font-bold text-gray-700">الاسم (الإنجليزية)</Label>
                    <Input id="name_en" name="name_en" dir='ltr' defaultValue={currentCity?.name_en || ''} required className="rounded-lg bg-gray-50" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="support_number" className="font-bold text-gray-700">رقم خدمة العملاء</Label>
                    <Input id="support_number" name="support_number" dir='ltr' defaultValue={currentCity?.support_number || ''} required className="rounded-lg bg-gray-50" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="country_code" className="font-bold text-gray-700">رمز الدولة</Label>
                    <Input id="country_code" name="country_code" dir='ltr' defaultValue={currentCity?.country_code || 'YE'} required className="rounded-lg bg-gray-50" />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <Switch
                        id="is_active"
                        name="is_active"
                        checked={isCityActive}
                        onCheckedChange={setIsCityActive}
                    />
                    <Label htmlFor="is_active" className="w-32 text-right font-bold text-gray-700">
                      {isCityActive ? 'المدينة نشطة' : 'المدينة غير نشطة'}
                    </Label>
                </div>
            </div>
            <DialogFooter className="flex-row-reverse pt-4 border-t">
                <Button type="submit" disabled={isSubmitting} className="rounded-lg font-black">
                    {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin"/>}
                    {currentCity?.id ? 'حفظ التغييرات' : 'إضافة'}
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

    