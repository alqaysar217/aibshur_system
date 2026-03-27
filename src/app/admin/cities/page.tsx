'use client';
import { useState } from 'react';
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const yemeniCities = [
    { name_ar: 'صنعاء', name_en: 'Sana\'a', country_code: 'YE', is_active: true },
    { name_ar: 'عدن', name_en: 'Aden', country_code: 'YE', is_active: true },
    { name_ar: 'تعز', name_en: 'Taiz', country_code: 'YE', is_active: true },
    { name_ar: 'الحديدة', name_en: 'Al Hudaydah', country_code: 'YE', is_active: true },
    { name_ar: 'إب', name_en: 'Ibb', country_code: 'YE', is_active: false },
    { name_ar: 'ذمار', name_en: 'Dhamar', country_code: 'YE', is_active: false },
    { name_ar: 'المكلا', name_en: 'Al Mukalla', country_code: 'YE', is_active: true },
    { name_ar: 'سيئون', name_en: 'Say\'un', country_code: 'YE', is_active: false },
    { name_ar: 'زبيد', name_en: 'Zabid', country_code: 'YE', is_active: false },
    { name_ar: 'مأرب', name_en: 'Marib', country_code: 'YE', is_active: true },
];

const TableSkeleton = () => (
    <div className="space-y-2">
        {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-20" />
            </div>
        ))}
    </div>
)

export default function AdminCitiesPage() {
  const firestore = useFirestore();
  const citiesCollection = firestore ? collection(firestore, 'cities') : null;
  const { data: cities, loading, error } = useCollection<City>(citiesCollection);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [currentCity, setCurrentCity] = useState<Partial<City> | null>(null);

  const handleOpenDialog = (city: Partial<City> | null = null) => {
    setCurrentCity(city);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentCity || !citiesCollection) return;

    const formData = new FormData(e.currentTarget);
    const cityData = {
      name_ar: formData.get('name_ar') as string,
      name_en: formData.get('name_en') as string,
      country_code: formData.get('country_code') as string,
      is_active: formData.get('is_active') === 'on',
    };

    if (!cityData.name_ar || !cityData.name_en || !cityData.country_code) {
        toast({ variant: 'destructive', title: "الرجاء ملء جميع الحقول"});
        return;
    }

    setIsSubmitting(true);
    try {
      if (currentCity.cityId) {
        const cityRef = doc(firestore, 'cities', currentCity.cityId);
        await updateDoc(cityRef, cityData);
        toast({ title: 'تم تحديث المدينة بنجاح' });
      } else {
        const newDocRef = doc(citiesCollection);
        await addDoc(citiesCollection, { ...cityData, cityId: newDocRef.id });
        toast({ title: 'تمت إضافة المدينة بنجاح' });
      }
      setDialogOpen(false);
      setCurrentCity(null);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'حدث خطأ', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cityId: string) => {
      if(!firestore || !window.confirm("هل أنت متأكد أنك تريد حذف هذه المدينة؟")) return;
      try {
          await deleteDoc(doc(firestore, 'cities', cityId));
          toast({ title: 'تم حذف المدينة' });
      } catch (err: any) {
          console.error(err);
          toast({ variant: 'destructive', title: 'حدث خطأ أثناء الحذف', description: err.message });
      }
  }

  const handleSeedCities = async () => {
    if (!firestore || !citiesCollection) return;
    setSeeding(true);
    try {
      const batch = writeBatch(firestore);
      yemeniCities.forEach(city => {
        const docRef = doc(citiesCollection);
        batch.set(docRef, { ...city, cityId: docRef.id });
      });
      await batch.commit();
      toast({ title: 'نجاح', description: 'تمت إضافة المدن اليمنية إلى قاعدة البيانات بنجاح.' });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'حدث خطأ', description: 'فشل إضافة البيانات الأولية.' });
    } finally {
        setSeeding(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-3xl font-bold">إدارة المدن</h1>
          <p className="text-muted-foreground">إضافة وتعديل المدن المتاحة في النظام.</p>
        </div>
        <Button onClick={() => handleOpenDialog({})}>
          <PlusCircle className="w-4 h-4 ml-2" />
          إضافة مدينة
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم (العربية)</TableHead>
                <TableHead>الاسم (الإنجليزية)</TableHead>
                <TableHead>رمز الدولة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableSkeleton />}
              {!loading && cities?.map((city) => (
                <TableRow key={city.cityId}>
                  <TableCell className="font-medium text-right">{city.name_ar}</TableCell>
                  <TableCell>{city.name_en}</TableCell>
                  <TableCell>{city.country_code}</TableCell>
                  <TableCell>
                    <Badge variant={city.is_active ? 'secondary' : 'outline'}>
                        {city.is_active ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(city)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                     <Button variant="ghost" size="icon" className='text-destructive hover:text-destructive' onClick={() => handleDelete(city.cityId)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {!loading && cities?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-lg">لا توجد مدن بعد.</p>
                        <p className='text-muted-foreground'>يمكنك البدء بإضافة مدينة يدوياً، أو ملء القائمة ببيانات أولية للمدن اليمنية.</p>
                        <Button onClick={handleSeedCities} disabled={seeding}>
                            {seeding ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Database className="w-4 h-4 ml-2" />}
                            {seeding ? 'جاري الإضافة...' : 'إضافة بيانات المدن اليمنية'}
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader className="text-right">
                <DialogTitle>{currentCity?.cityId ? 'تعديل مدينة' : 'إضافة مدينة جديدة'}</DialogTitle>
                <DialogDescription>املأ التفاصيل أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-right">
                <div className="space-y-2">
                    <Label htmlFor="name_ar">الاسم (العربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={currentCity?.name_ar || ''} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="name_en">الاسم (الإنجليزية)</Label>
                    <Input id="name_en" name="name_en" dir='ltr' defaultValue={currentCity?.name_en || ''} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="country_code">رمز الدولة</Label>
                    <Input id="country_code" name="country_code" dir='ltr' defaultValue={currentCity?.country_code || 'YE'} required />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <Label htmlFor="is_active">فعالة</Label>
                    <Switch id="is_active" name="is_active" defaultChecked={currentCity?.is_active ?? true} />
                </div>
            </div>
            <DialogFooter className="flex-row-reverse">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin"/>}
                    {currentCity?.cityId ? 'حفظ التغييرات' : 'إضافة'}
                </Button>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">إلغاء</Button>
                </DialogClose>
            </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
