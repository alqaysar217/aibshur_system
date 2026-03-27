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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
  
  // NOTE: Form submission logic is disabled while auth is bypassed.
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({ variant: 'destructive', title: "التعديل معطل", description: "تم تعطيل هذه الميزة مؤقتاً." });
  };

  // NOTE: Delete logic is disabled while auth is bypassed.
  const handleDelete = async (cityId: string) => {
    toast({ variant: 'destructive', title: "الحذف معطل", description: "تم تعطيل هذه الميزة مؤقتاً." });
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
              {cities.map((city) => (
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
               {cities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <p className="text-lg">لا توجد مدن معرفة.</p>
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
