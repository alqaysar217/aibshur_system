'use client';
import { useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AdminCitiesPage() {
  const firestore = useFirestore();
  const { data: cities, loading, error } = useCollection<City>(
    firestore ? collection(firestore, 'cities') : null
  );
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCity, setCurrentCity] = useState<Partial<City> | null>(null);

  const handleOpenDialog = (city: Partial<City> | null = null) => {
    setCurrentCity(city);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentCity) return;

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
        // Update existing city
        const cityRef = doc(firestore, 'cities', currentCity.cityId);
        await updateDoc(cityRef, cityData);
        toast({ title: 'تم تحديث المدينة بنجاح' });
      } else {
        // Create new city
        const newCityRef = await addDoc(collection(firestore, 'cities'), cityData);
        // update the document to include the cityId
        await updateDoc(newCityRef, { cityId: newCityRef.id });

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
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    جاري تحميل البيانات...
                  </TableCell>
                </TableRow>
              )}
              {cities?.map((city) => (
                <TableRow key={city.cityId}>
                  <TableCell className="font-medium text-right">{city.name_ar}</TableCell>
                  <TableCell>{city.name_en}</TableCell>
                  <TableCell>{city.country_code}</TableCell>
                  <TableCell>{city.is_active ? 'نشطة' : 'غير نشطة'}</TableCell>
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
                  <TableCell colSpan={5} className="h-24 text-center">
                    لا توجد مدن. قم بإضافة مدينة جديدة.
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
                <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch id="is_active" name="is_active" defaultChecked={currentCity?.is_active ?? true} />
                    <Label htmlFor="is_active">فعالة</Label>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">إلغاء</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin"/>}
                    {currentCity?.cityId ? 'حفظ التغييرات' : 'إضافة'}
                </Button>
            </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
