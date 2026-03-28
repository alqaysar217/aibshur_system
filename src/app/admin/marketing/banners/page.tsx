'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFirestore, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { AdBanner, Store, Product } from '@/lib/types';
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
  DialogDescription,
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
import { PlusCircle, Edit, Trash2, Loader2, GalleryHorizontal, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={5} className="p-0">
            <Skeleton className="w-full h-[70px]"/>
        </TableCell>
    </TableRow>
);

export default function AdminBannersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentBanner, setCurrentBanner] = useState<Partial<AdBanner> | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<AdBanner | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Search/Picker State
  const [searchQuery, setSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch Banners
  const bannersQuery = useMemo(() => firestore ? collection(firestore, 'ad_banners') : null, [firestore]);
  const { data: banners, loading: bannersLoading, error: bannersError } = useCollection<AdBanner>(bannersQuery, 'ad_banners');

  // Fetch Stores and Products for dropdowns
  useEffect(() => {
    if (!firestore) {
      setDataLoading(false);
      return;
    }
    
    const fetchDropdownData = async () => {
      try {
        const storesPromise = getDocs(collection(firestore, 'stores'));
        const productsPromise = getDocs(collection(firestore, 'products'));
        
        const [storesSnapshot, productsSnapshot] = await Promise.all([storesPromise, productsPromise]);
        
        setStores(storesSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Store)));
        setProducts(productsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product)));

      } catch (error) {
        console.error("Error fetching stores or products:", error);
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

  const handleOpenDialog = (banner: Partial<AdBanner> | null = null) => {
    if (banner) {
      setCurrentBanner({ ...banner });
      setImagePreview(banner.image_url || '');
    } else {
      setCurrentBanner({ 
        is_active: true,
        sort_order: 0,
        target_type: 'general',
      });
      setImagePreview('');
    }
    setSearchQuery('');
    setIsPickerOpen(false);
    setDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (banner: AdBanner) => {
    setBannerToDelete(banner);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentBanner) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    let bannerData: Partial<AdBanner> = {
      ...currentBanner,
      image_url: formData.get('image_url') as string,
      sort_order: Number(formData.get('sort_order') || 0),
    };
    
    if (bannerData.target_type === 'general') {
        bannerData.target_id = '';
    }

    if (!bannerData.image_url) {
        toast({ variant: 'destructive', title: "بيانات ناقصة", description: "الرجاء إدخال رابط صورة الإعلان." });
        setIsSubmitting(false);
        return;
    }

    if (bannerData.target_type !== 'general' && !bannerData.target_id) {
        toast({ variant: 'destructive', title: "بيانات ناقصة", description: `الرجاء اختيار ${bannerData.target_type === 'store' ? 'متجر' : 'منتج'} للربط.` });
        setIsSubmitting(false);
        return;
    }

    let docRef;

    try {
      if (currentBanner.id) {
        docRef = doc(firestore, 'ad_banners', currentBanner.id);
        await updateDoc(docRef, bannerData);
        toast({ title: "تم التحديث بنجاح" });
      } else {
        docRef = doc(collection(firestore, 'ad_banners'));
        const fullData: AdBanner = {
            ...(bannerData as AdBanner),
            bannerId: docRef.id,
        };
        await setDoc(docRef, fullData);
        toast({ title: "تمت الإضافة بنجاح" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving banner:", error);
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: docRef!.path,
          operation: currentBanner.id ? 'update' : 'create',
          requestResourceData: bannerData
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
    if (!firestore || !bannerToDelete) return;
    const docRef = doc(firestore, 'ad_banners', bannerToDelete.id!);
    try {
      await deleteDoc(docRef);
      toast({ title: "تم الحذف بنجاح" });
    } catch (error: any) {
      console.error("Error deleting banner:", error);
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({ variant: 'destructive', title: "خطأ في الحذف" });
      }
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleActive = async (bannerId: string, currentStatus: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'ad_banners', bannerId);
    try {
      await updateDoc(docRef, { is_active: !currentStatus });
      toast({ title: `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الإعلان`});
    } catch (error: any) {
      console.error("Error toggling active status: ", error);
      toast({ variant: 'destructive', title: 'فشل تغيير الحالة' });
    }
  }
  
  const getTargetName = useCallback((type: string, id?: string) => {
    if (!id || type === 'general') return 'لا يوجد';
    if (dataLoading) return 'جاري التحميل...';
    if (type === 'store') {
        return stores.find(s => s.id === id)?.name_ar || 'متجر محذوف';
    }
    if (type === 'product') {
        return products.find(p => p.id === id)?.name_ar || 'منتج محذوف';
    }
    return 'غير معروف';
  }, [stores, products, dataLoading]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    if (currentBanner?.target_type === 'store') {
        return stores.filter(s => s.name_ar.toLowerCase().includes(lowercasedQuery));
    }
    if (currentBanner?.target_type === 'product') {
        return products.filter(p => p.name_ar.toLowerCase().includes(lowercasedQuery));
    }
    return [];
  }, [searchQuery, currentBanner?.target_type, stores, products]);

  if (bannersError) {
    if (bannersError.message.includes('database (default) does not exist') || bannersError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p>خطأ: {bannersError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة الإعلانات المتحركة</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إضافة وتعديل وحذف إعلانات السلايدر في واجهة المستخدم.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle /> إضافة إعلان جديد
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50">
          <CardTitle className="text-sm font-black flex items-center gap-2"><GalleryHorizontal className="h-4 w-4 text-primary" /> قائمة الإعلانات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="text-center w-[180px]">صورة الإعلان</TableHead>
                <TableHead className="text-center">وجهة النقر</TableHead>
                <TableHead className="text-center">الترتيب</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center w-[120px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {bannersLoading ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : banners?.map((banner) => (
                    <TableRow key={banner.id} className="hover:bg-muted/50">
                      <TableCell className="p-2 align-middle">
                        <Image src={banner.image_url} alt="Banner image" width={128} height={64} className="mx-auto h-16 w-32 rounded-lg bg-gray-100 object-cover" />
                      </TableCell>
                      <TableCell className="text-center align-middle font-bold text-xs text-gray-500">{getTargetName(banner.target_type, banner.target_id)}</TableCell>
                      <TableCell className="text-center align-middle font-bold text-xs text-gray-500">{banner.sort_order}</TableCell>
                      <TableCell className="text-center align-middle">
                        <Badge
                            onClick={() => handleToggleActive(banner.id!, banner.is_active)}
                            className={cn(
                                "cursor-pointer rounded-xl border-none font-black px-3 py-1 text-[9px] transition-colors",
                                banner.is_active ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                            )}
                        >
                            {banner.is_active ? 'نشط' : 'معطل'}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(banner)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleOpenDeleteDialog(banner)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
                {banners?.length === 0 && !bannersLoading && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground font-bold p-10">لا توجد إعلانات مضافة حالياً.</TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="font-black text-gray-900">{currentBanner?.id ? 'تعديل إعلان' : 'إضافة إعلان جديد'}</DialogTitle>
              <DialogDescription>املأ تفاصيل الإعلان أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
              
                <div className="space-y-2"><Label>رابط صورة الإعلان</Label><Input name="image_url" defaultValue={currentBanner?.image_url} placeholder="https://..." required className="rounded-lg bg-gray-50" dir="ltr" onChange={(e) => setImagePreview(e.target.value)} /></div>
                {imagePreview && (imagePreview.startsWith('http') || imagePreview.startsWith('/')) && (
                    <div className="flex justify-center p-2 border rounded-xl bg-gray-50/50">
                        <Image src={imagePreview} alt="معاينة الصورة" width={240} height={120} className="rounded-lg object-cover"/>
                    </div>
                )}
                
                <div className="p-4 border rounded-xl space-y-4">
                    <div className="space-y-2">
                        <Label>وجهة النقر (Deep Link)</Label>
                        <select
                            value={currentBanner?.target_type || 'general'}
                            onChange={(e) => setCurrentBanner(prev => ({ ...prev, target_type: e.target.value as AdBanner['target_type'], target_id: '' }))}
                            className="h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                        >
                            <option value="general">عام (للعرض فقط)</option>
                            <option value="store">متجر محدد</option>
                            <option value="product">منتج محدد</option>
                        </select>
                    </div>

                    {currentBanner?.target_type !== 'general' && !currentBanner?.target_id && (
                        <div ref={pickerRef} className="space-y-2 animate-in fade-in duration-300 relative">
                            <Label>ابحث عن {currentBanner?.target_type === 'store' ? 'المتجر' : 'المنتج'}</Label>
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
                                            onClick={() => {
                                                setCurrentBanner(prev => ({ ...prev, target_id: item.id }));
                                                setSearchQuery('');
                                                setIsPickerOpen(false);
                                            }}
                                            className="flex items-center w-full text-right p-2 gap-3 hover:bg-gray-100"
                                        >
                                            <Image src={item.logo_url || item.main_image_url || ''} alt={item.name_ar} width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{item.name_ar}</p>
                                                {item.base_price && <p className="text-xs text-muted-foreground">{item.base_price} ر.ي</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {currentBanner?.target_id && (
                        <div className="p-3 border rounded-lg bg-primary/5 flex items-center justify-between animate-in fade-in duration-300">
                             <div className="flex items-center gap-3">
                                <Image 
                                    src={(currentBanner.target_type === 'store' ? stores.find(s=>s.id === currentBanner.target_id)?.logo_url : products.find(p=>p.id === currentBanner.target_id)?.main_image_url) || ''} 
                                    alt="Selected item" width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100" 
                                />
                                <div>
                                    <Label className="text-xs text-muted-foreground">الوجهة المحددة</Label>
                                    <p className="font-bold text-sm text-primary">{getTargetName(currentBanner.target_type!, currentBanner.target_id)}</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setCurrentBanner(prev => ({...prev, target_id: ''}))}>
                                <X className="w-4 h-4"/>
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>رقم الترتيب</Label>
                        <Input name="sort_order" type="number" defaultValue={currentBanner?.sort_order || 0} required className="rounded-lg bg-gray-50" dir="ltr" />
                     </div>
                     <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 h-full">
                        <Label htmlFor="is_active" className="font-bold text-gray-700">{currentBanner?.is_active ? 'الإعلان نشط' : 'الإعلان معطل'}</Label>
                        <Switch id="is_active" checked={currentBanner?.is_active} onCheckedChange={(checked) => setCurrentBanner(prev => ({...prev, is_active: checked}))} dir="ltr"/>
                     </div>
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
            <AlertDialogDescription>سيتم حذف هذا الإعلان بشكل نهائي.</AlertDialogDescription>
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
