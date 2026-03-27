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
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, Store as StoreIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المتاجر</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إضافة وتعديل بيانات المتاجر المسجلة في النظام.</p>
        </div>
        <Button onClick={() => handleOpenDialog({})} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
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
                <TableHead className="px-6 py-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {stores.length > 0 ? (
                stores.map((store) => (
                  <TableRow key={store.storeId} className="hover:bg-gray-50/50">
                    <TableCell className="px-6 py-4 font-bold text-xs text-gray-700">{store.name_ar}</TableCell>
                    <TableCell className="px-6 py-4 font-bold text-xs text-gray-400">{mockCities.find(c => c.cityId === store.city_id)?.name_ar || 'غير محدد'}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge className={cn(
                        "rounded-xl border-none font-black px-3 py-1 text-[9px]",
                        store.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {store.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 flex gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(store)}>
                        <Edit className="w-4 h-4 text-gray-400" />
                      </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(store.storeId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-gray-400 font-bold">
                    <p>لا توجد متاجر مضافة بعد.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader className="text-right">
                <DialogTitle className="font-black text-gray-900">{currentStore?.storeId ? 'تعديل متجر' : 'إضافة متجر جديد'}</DialogTitle>
                <DialogDescription className="font-bold text-gray-400">املأ تفاصيل المتجر أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-right max-h-[70vh] overflow-y-auto pr-2 pl-4">
                <div className="space-y-2">
                    <Label htmlFor="name_ar" className="font-bold text-gray-700">اسم المتجر (العربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={currentStore?.name_ar || ''} required className="rounded-lg"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category" className="font-bold text-gray-700">نوع المتجر (الفئة)</Label>
                    <Select name="category" dir="rtl">
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
                    <Label htmlFor="city" className="font-bold text-gray-700">المدينة</Label>
                     <Select name="city" dir="rtl">
                      <SelectTrigger className="rounded-lg font-bold">
                        <SelectValue placeholder="اختر المدينة" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {mockCities.map(city => (
                          <SelectItem key={city.cityId} value={city.cityId}>{city.name_ar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-bold text-md text-gray-800">ساعات العمل</h4>
                    {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                        <div key={day} className="flex items-center justify-between gap-2">
                            <Label htmlFor={`day-${day}`} className="w-1/4 font-bold text-gray-700">{day}</Label>
                            <div className="flex items-center gap-2">
                               <Input type="time" id={`day-${day}-open`} name={`day-${day}-open`} className="w-full rounded-lg" />
                               <span>-</span>
                               <Input type="time" id={`day-${day}-close`} name={`day-${day}-close`} className="w-full rounded-lg" />
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
            <DialogFooter className="flex-row-reverse mt-4">
                <Button type="submit" disabled={isSubmitting} className="rounded-lg font-black">
                    {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin"/>}
                    {currentStore?.storeId ? 'حفظ التغييرات' : 'إضافة المتجر'}
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
