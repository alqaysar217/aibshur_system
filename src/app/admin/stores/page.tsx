'use client';
import { useState } from 'react';
import { mockCities, mockCategories, mockStores } from '@/lib/mock-data';
import type { Store } from '@/lib/types';
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
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminStoresPage() {
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>(mockStores);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Store> | null>(null);

  const handleOpenDialog = (store: Partial<Store> | null = null) => {
    setCurrentStore(store);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({ variant: 'destructive', title: "التعديل معطل", description: "تم تعطيل هذه الميزة مؤقتاً." });
  };

  const handleDelete = async (storeId: string) => {
    toast({ variant: 'destructive', title: "الحذف معطل", description: "تم تعطيل هذه الميزة مؤقتاً." });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-3xl font-bold">إدارة المتاجر</h1>
          <p className="text-muted-foreground">إضافة وتعديل المتاجر في النظام.</p>
        </div>
        <Button onClick={() => handleOpenDialog({})}>
          <PlusCircle className="w-4 h-4 ml-2" />
          إضافة متجر
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم المتجر</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length > 0 ? (
                stores.map((store) => (
                  <TableRow key={store.storeId}>
                    <TableCell className="font-medium text-right">{store.name_ar}</TableCell>
                    <TableCell>{mockCities.find(c => c.cityId === store.city_id)?.name_ar || 'غير محدد'}</TableCell>
                    <TableCell>
                      <Badge variant={store.is_active ? 'secondary' : 'outline'}>
                        {store.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(store)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className='text-destructive hover:text-destructive' onClick={() => handleDelete(store.storeId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <p className="text-lg">لا توجد متاجر مضافة بعد.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader className="text-right">
                <DialogTitle>{currentStore?.storeId ? 'تعديل متجر' : 'إضافة متجر جديد'}</DialogTitle>
                <DialogDescription>املأ تفاصيل المتجر أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-right max-h-[70vh] overflow-y-auto pr-2 pl-4">
                <div className="space-y-2">
                    <Label htmlFor="name_ar">اسم المتجر (العربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={currentStore?.name_ar || ''} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">نوع المتجر (الفئة)</Label>
                    <Select name="category" dir="rtl">
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCategories.map(cat => (
                          <SelectItem key={cat.filterId} value={cat.filterId}>{cat.name_ar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">المدينة</Label>
                     <Select name="city" dir="rtl">
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المدينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCities.map(city => (
                          <SelectItem key={city.cityId} value={city.cityId}>{city.name_ar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-4 p-4 border rounded-md">
                    <h4 className="font-semibold text-md">ساعات العمل</h4>
                    {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                        <div key={day} className="flex items-center justify-between gap-2">
                            <Label htmlFor={`day-${day}`} className="w-1/4">{day}</Label>
                            <div className="flex items-center gap-2">
                               <Input type="time" id={`day-${day}-open`} name={`day-${day}-open`} className="w-full" />
                               <span>-</span>
                               <Input type="time" id={`day-${day}-close`} name={`day-${day}-close`} className="w-full" />
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
            <DialogFooter className="flex-row-reverse mt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin"/>}
                    {currentStore?.storeId ? 'حفظ التغييرات' : 'إضافة المتجر'}
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
