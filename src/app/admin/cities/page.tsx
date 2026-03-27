'use client';
import { useState } from 'react';
import { mockCities } from '@/lib/mock-data';
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
import { PlusCircle, Edit, Trash2, Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AdminCitiesPage() {
  const { toast } = useToast();
  const [cities, setCities] = useState<City[]>(mockCities);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCity, setCurrentCity] = useState<Partial<City> | null>(null);

  const handleOpenDialog = (city: Partial<City> | null = null) => {
    setCurrentCity(city);
    setDialogOpen(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({ variant: 'destructive', title: "التعديل معطل", description: "تم تعطيل هذه الميزة مؤقتاً." });
  };

  const handleDelete = async (cityId: string) => {
    toast({ variant: 'destructive', title: "الحذف معطل", description: "تم تعطيل هذه الميزة مؤقتاً." });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المدن والمحافظات</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إضافة وتعديل وحذف المدن التي يغطيها تطبيق أبشر.</p>
        </div>
        <Button onClick={() => handleOpenDialog({})} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle className="w-4 h-4" />
          إضافة مدينة جديدة
        </Button>
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
                <TableHead className="px-6 py-4 text-right">الاسم (العربية)</TableHead>
                <TableHead className="px-6 py-4">الاسم (الإنجليزية)</TableHead>
                <TableHead className="px-6 py-4">رمز الدولة</TableHead>
                <TableHead className="px-6 py-4">الحالة</TableHead>
                <TableHead className="px-6 py-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {cities.map((city) => (
                <TableRow key={city.cityId} className="hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4 font-bold text-xs text-gray-700">{city.name_ar}</TableCell>
                  <TableCell className="px-6 py-4 font-bold text-xs text-gray-400">{city.name_en}</TableCell>
                  <TableCell className="px-6 py-4 font-bold text-xs text-gray-700">{city.country_code}</TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge className={cn(
                        "rounded-xl border-none font-black px-3 py-1 text-[9px]",
                        city.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                        {city.is_active ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(city)}>
                      <Edit className="w-4 h-4 text-gray-400" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(city.cityId)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {cities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-gray-400 font-bold">
                    <p>لا توجد مدن معرفة بعد.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-lg">
           <form onSubmit={handleFormSubmit}>
            <DialogHeader className="text-right">
                <DialogTitle className="font-black text-gray-900">{currentCity?.cityId ? 'تعديل مدينة' : 'إضافة مدينة جديدة'}</DialogTitle>
                <DialogDescription className="font-bold text-gray-400">املأ التفاصيل أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-right">
                <div className="space-y-2">
                    <Label htmlFor="name_ar" className="font-bold text-gray-700">الاسم (العربية)</Label>
                    <Input id="name_ar" name="name_ar" defaultValue={currentCity?.name_ar || ''} required className="rounded-lg" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="name_en" className="font-bold text-gray-700">الاسم (الإنجليزية)</Label>
                    <Input id="name_en" name="name_en" dir='ltr' defaultValue={currentCity?.name_en || ''} required className="rounded-lg" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="country_code" className="font-bold text-gray-700">رمز الدولة</Label>
                    <Input id="country_code" name="country_code" dir='ltr' defaultValue={currentCity?.country_code || 'YE'} required className="rounded-lg" />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Label htmlFor="is_active" className="font-bold text-gray-700">فعالة</Label>
                    <Switch id="is_active" name="is_active" defaultChecked={currentCity?.is_active ?? true} />
                </div>
            </div>
            <DialogFooter className="flex-row-reverse">
                <Button type="submit" disabled={isSubmitting} className="rounded-lg font-black">
                    {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin"/>}
                    {currentCity?.cityId ? 'حفظ التغييرات' : 'إضافة'}
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
