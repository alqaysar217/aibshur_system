'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFirestore, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { Coupon, Store, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
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
import { PlusCircle, Edit, Trash2, Loader2, TicketPercent, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { format } from 'date-fns';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={7} className="p-0">
            <Skeleton className="w-full h-[70px]"/>
        </TableCell>
    </TableRow>
);

export default function AdminCouponsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentCoupon, setCurrentCoupon] = useState<Partial<Coupon> | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Search/Picker State
  const [searchQuery, setSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch Coupons
  const couponsQuery = useMemo(() => firestore ? collection(firestore, 'coupons') : null, [firestore]);
  const { data: coupons, loading: couponsLoading, error: couponsError } = useCollection<Coupon>(couponsQuery, 'coupons');

  // Fetch Stores and Products for dropdowns
  useEffect(() => {
    if (!firestore) {
      setDataLoading(false);
      return;
    }
    const fetchDropdownData = async () => {
      try {
        const [storesSnapshot, productsSnapshot] = await Promise.all([
          getDocs(collection(firestore, 'stores')),
          getDocs(collection(firestore, 'products'))
        ]);
        setStores(storesSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Store)));
        setProducts(productsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
      } catch (error) {
        console.error("Error fetching dependent data:", error);
        toast({ variant: 'destructive', title: "خطأ في جلب بيانات المتاجر/المنتجات" });
      } finally {
        setDataLoading(false);
      }
    };
    fetchDropdownData();
  }, [firestore, toast]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pickerRef]);

  const handleOpenDialog = (coupon: Partial<Coupon> | null = null) => {
    if (coupon) {
      setCurrentCoupon({ ...coupon, scope_ids: coupon.scope_ids || [] });
    } else {
      setCurrentCoupon({ 
        is_active: true,
        discount_type: 'percentage',
        discount_value: 10,
        scope: 'global',
        scope_ids: [],
        usage_limit: 100,
        expiry_date: new Date().toISOString(),
      });
    }
    setSearchQuery('');
    setIsPickerOpen(false);
    setDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentCoupon) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    let couponData: Partial<Coupon> = {
      ...currentCoupon,
      code: formData.get('code') as string,
      discount_value: Number(formData.get('discount_value')),
      min_order_value: Number(formData.get('min_order_value') || 0),
      usage_limit: Number(formData.get('usage_limit') || 100),
      expiry_date: new Date(formData.get('expiry_date') as string).toISOString(),
    };

    if (couponData.scope === 'global') {
        couponData.scope_ids = [];
    } else if (!couponData.scope_ids || couponData.scope_ids.length === 0) {
        toast({ variant: 'destructive', title: "بيانات ناقصة", description: "الرجاء اختيار متجر أو منتج واحد على الأقل." });
        setIsSubmitting(false);
        return;
    }

    if (!couponData.code || !couponData.discount_value || !couponData.expiry_date) {
        toast({ variant: 'destructive', title: "بيانات ناقصة", description: "الرجاء تعبئة الحقول الإلزامية." });
        setIsSubmitting(false);
        return;
    }
    
    if (new Date(couponData.expiry_date) < new Date() && couponData.is_active) {
        toast({ variant: 'destructive', title: "تاريخ غير صالح", description: "لا يمكن تفعيل كوبون منتهي الصلاحية." });
        couponData.is_active = false;
    }

    let docRef;

    try {
      if (currentCoupon.id) {
        docRef = doc(firestore, 'coupons', currentCoupon.id);
        await updateDoc(docRef, couponData);
        toast({ title: "تم التحديث بنجاح" });
      } else {
        docRef = doc(collection(firestore, 'coupons'));
        const fullData: Coupon = {
            ...(couponData as Coupon),
            couponId: docRef.id,
        };
        await setDoc(docRef, fullData);
        toast({ title: "تمت الإضافة بنجاح" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving coupon:", error);
       if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: docRef!.path,
          operation: currentCoupon.id ? 'update' : 'create',
          requestResourceData: couponData
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({ variant: 'destructive', title: "حدث خطأ", description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firestore || !couponToDelete) return;
    const docRef = doc(firestore, 'coupons', couponToDelete.id!);
    try {
      await deleteDoc(docRef);
      toast({ title: "تم الحذف بنجاح" });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
      } else {
        toast({ variant: 'destructive', title: "خطأ في الحذف" });
      }
    } finally {
      setDeleteDialogOpen(false);
    }
  };
  
  const getScopeName = useCallback((scope: string, ids?: string[]) => {
    if (scope === 'global' || !ids || ids.length === 0) return 'شامل';

    const names = ids.map(id => {
        if (scope === 'store') return stores.find(s => s.id === id)?.name_ar;
        if (scope === 'product') return products.find(p => p.id === id)?.name_ar;
        return null;
    }).filter(Boolean) as string[];

    if (names.length === 0) return 'عناصر محذوفة';
    if (names.length <= 2) return names.join(' و ');
    return `${names.length} ${scope === 'store' ? 'متاجر' : 'منتجات'}`;
  }, [stores, products]);

  const handleScopeItemSelect = (id: string) => {
    if (!currentCoupon?.scope_ids?.includes(id)) {
        setCurrentCoupon(prev => ({...prev, scope_ids: [...(prev?.scope_ids || []), id]}));
    }
    setSearchQuery('');
    setIsPickerOpen(false);
  }

  const handleScopeItemRemove = (id: string) => {
    setCurrentCoupon(prev => ({...prev, scope_ids: prev?.scope_ids?.filter(scopeId => scopeId !== id)}));
  }

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    if (currentCoupon?.scope === 'store') {
        return stores.filter(s => s.name_ar.toLowerCase().includes(lowercasedQuery));
    }
    if (currentCoupon?.scope === 'product') {
        return products.filter(p => p.name_ar.toLowerCase().includes(lowercasedQuery));
    }
    return [];
  }, [searchQuery, currentCoupon?.scope, stores, products]);


  if (couponsError) {
    if (couponsError.message.includes('database (default) does not exist') || couponsError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p>خطأ: {couponsError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة كوبونات الخصم</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إنشاء وتعديل الكوبونات الذكية للنظام.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle /> إضافة كوبون جديد
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50">
          <CardTitle className="text-sm font-black flex items-center gap-2"><TicketPercent className="h-4 w-4 text-primary" /> قائمة الكوبونات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="text-center">الكود</TableHead>
                <TableHead className="text-center">القيمة</TableHead>
                <TableHead className="text-center">نطاق الخصم</TableHead>
                <TableHead className="text-center">تاريخ الانتهاء</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center w-[120px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {couponsLoading ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : coupons?.map((coupon) => (
                    <TableRow key={coupon.id} className="hover:bg-muted/50">
                      <TableCell className="text-center align-middle font-mono font-bold text-primary">{coupon.code}</TableCell>
                      <TableCell className="text-center align-middle font-bold text-xs text-gray-700">
                        {coupon.discount_value} {coupon.discount_type === 'percentage' ? '%' : 'ر.ي'}
                      </TableCell>
                      <TableCell className="text-center align-middle font-bold text-xs text-gray-500">{getScopeName(coupon.scope, coupon.scope_ids)}</TableCell>
                      <TableCell className="text-center align-middle font-bold text-xs text-gray-500">{format(new Date(coupon.expiry_date), 'yyyy/MM/dd')}</TableCell>
                      <TableCell className="text-center align-middle">
                        <Badge className={cn("font-black", coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{coupon.is_active ? 'فعال' : 'معطل'}</Badge>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(coupon)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleOpenDeleteDialog(coupon)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-2xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="font-black text-gray-900">{currentCoupon?.id ? 'تعديل كوبون' : 'إضافة كوبون جديد'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>كود الخصم</Label><Input name="code" defaultValue={currentCoupon?.code} required className="rounded-lg bg-gray-50 font-mono" dir="ltr" /></div>
                <div className="space-y-2"><Label>نوع الخصم</Label>
                    <select
                        value={currentCoupon?.discount_type || 'percentage'}
                        onChange={(e) => setCurrentCoupon(prev => ({...prev, discount_type: e.target.value as Coupon['discount_type']}))}
                        className="h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 font-bold"
                    >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed_amount">مبلغ ثابت (ر.ي)</option>
                    </select>
                </div>
              </div>
              <div className="space-y-2"><Label>قيمة الخصم</Label><Input name="discount_value" type="number" defaultValue={currentCoupon?.discount_value} required className="rounded-lg bg-gray-50" dir="ltr" /></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2"><Label>الحد الأدنى للطلب (اختياري)</Label><Input name="min_order_value" type="number" defaultValue={currentCoupon?.min_order_value || 0} className="rounded-lg bg-gray-50" dir="ltr" /></div>
                 <div className="space-y-2"><Label>عدد مرات الاستخدام</Label><Input name="usage_limit" type="number" defaultValue={currentCoupon?.usage_limit || 100} required className="rounded-lg bg-gray-50" dir="ltr" /></div>
              </div>
               <div className="space-y-2"><Label>تاريخ الانتهاء</Label><Input name="expiry_date" type="date" defaultValue={currentCoupon?.expiry_date ? format(new Date(currentCoupon.expiry_date), 'yyyy-MM-dd') : ''} required className="rounded-lg bg-gray-50" /></div>
               
                <div className="space-y-2 p-4 border rounded-xl">
                    <Label className="font-bold">نطاق تطبيق الخصم</Label>
                    <select
                        value={currentCoupon?.scope || 'global'}
                        onChange={(e) => setCurrentCoupon(prev => ({ ...prev, scope: e.target.value as Coupon['scope'], scope_ids: [] }))}
                        className="h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 font-bold mb-4"
                    >
                        <option value="global">شامل (على كل الطلبات)</option>
                        <option value="store">متجر/متاجر محددة</option>
                        <option value="product">منتج/منتجات محددة</option>
                    </select>
                    
                    {currentCoupon?.scope !== 'global' && (
                        <div ref={pickerRef} className="space-y-2 animate-in fade-in duration-300 relative">
                            <Label>اختر {currentCoupon?.scope === 'store' ? 'المتاجر' : 'المنتجات'}</Label>
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="ابحث بالاسم..."
                                    className="pr-10"
                                    onFocus={() => setIsPickerOpen(true)}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            {isPickerOpen && searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {searchResults.map((item: any) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleScopeItemSelect(item.id)}
                                            className="flex items-center w-full text-right p-2 gap-3 hover:bg-gray-100 disabled:opacity-50"
                                            disabled={currentCoupon.scope_ids?.includes(item.id)}
                                        >
                                            <Image src={item.logo_url || item.main_image_url} alt={item.name_ar} width={40} height={40} className="w-10 h-10 rounded-md object-cover" />
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{item.name_ar}</p>
                                                {item.base_price && <p className="text-xs text-muted-foreground">{item.base_price} ر.ي</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mt-2">
                                {currentCoupon?.scope_ids?.map(id => {
                                    const item = currentCoupon.scope === 'store' ? stores.find(s => s.id === id) : products.find(p => p.id === id);
                                    if (!item) return null;
                                    return (
                                        <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 text-sm gap-1">
                                            {item.name_ar}
                                            <button type="button" onClick={() => handleScopeItemRemove(id)} className="h-4 w-4 rounded-full bg-gray-400 text-white flex items-center justify-center hover:bg-gray-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50">
                    <Label htmlFor="is_active" className="font-bold text-gray-700">{currentCoupon?.is_active ? 'الكوبون فعال' : 'الكوبون معطل'}</Label>
                    <Switch id="is_active" checked={currentCoupon?.is_active} onCheckedChange={(checked) => setCurrentCoupon(prev => ({...prev, is_active: checked}))} dir="ltr"/>
                </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || dataLoading} className="rounded-lg font-black">{isSubmitting ? <Loader2 className="animate-spin"/> : 'حفظ'}</Button>
              <DialogClose asChild><Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button></DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف كوبون "{couponToDelete?.code}" بشكل نهائي.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">نعم، قم بالحذف</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
