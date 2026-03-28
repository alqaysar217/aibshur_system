'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import type { StoreCategory, ProductCategory, Store } from '@/lib/types';
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
import { PlusCircle, Edit, Trash2, Loader2, AppWindow, Pizza } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={5} className="p-0">
            <Skeleton className="w-full h-[60px]"/>
        </TableCell>
    </TableRow>
);

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState('store_categories');
  
  // Dialog states
  const [isStoreCatDialogOpen, setStoreCatDialogOpen] = useState(false);
  const [isProdCatDialogOpen, setProdCatDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStoreCategory, setCurrentStoreCategory] = useState<Partial<StoreCategory> | null>(null);
  const [currentProdCategory, setCurrentProdCategory] = useState<Partial<ProductCategory> | null>(null);
  const [storeCatImagePreview, setStoreCatImagePreview] = useState('');
  const [prodCatImagePreview, setProdCatImagePreview] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string, type: 'store' | 'product' } | null>(null);
  
  // Data fetching
  const storeCategoriesQuery = useMemo(() => firestore ? collection(firestore, 'store_categories') : null, [firestore]);
  const { data: storeCategories, loading: storeCategoriesLoading, error: storeCategoriesError } = useCollection<StoreCategory>(storeCategoriesQuery);

  const productCategoriesQuery = useMemo(() => firestore ? collection(firestore, 'product_categories') : null, [firestore]);
  const { data: productCategories, loading: productCategoriesLoading, error: productCategoriesError } = useCollection<ProductCategory>(productCategoriesQuery);
  
  const storesQuery = useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(storesQuery);

  // CONSOLE DEBUGGING as requested
  useEffect(() => {
    console.groupCollapsed('--- CATEGORIES PAGE: DATA AUDIT ---');
    console.log('Collection: store_categories', { data: storeCategories, loading: storeCategoriesLoading, error: storeCategoriesError });
    console.log('Collection: product_categories', { data: productCategories, loading: productCategoriesLoading, error: productCategoriesError });
    console.log('Collection: stores', { data: stores, loading: storesLoading, error: storesError });
    console.groupEnd();
  }, [storeCategories, productCategories, stores, storeCategoriesLoading, productCategoriesLoading, storesLoading, storeCategoriesError, productCategoriesError, storesError]);


  const getStoreName = useCallback((storeId: string) => {
    return stores?.find(s => s.storeId === storeId)?.name_ar || 'متجر غير معروف';
  }, [stores]);
  
  // Handlers for Store Categories
  const handleOpenStoreCatDialog = (category: Partial<StoreCategory> | null = null) => {
    setCurrentStoreCategory(category ? { ...category } : { is_active: true, image_url: '' });
    setStoreCatImagePreview(category?.image_url || '');
    setStoreCatDialogOpen(true);
  };
  
  const handleStoreCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentStoreCategory) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name_en = (formData.get('name_ar') as string).toLowerCase().replace(/\s+/g, '_');
    
    const categoryData: Omit<StoreCategory, 'id' | 'categoryId'> = {
        name_ar: formData.get('name_ar') as string,
        name_en: name_en,
        image_url: formData.get('image_url') as string,
        is_active: currentStoreCategory.is_active ?? true,
    };

    try {
        if (currentStoreCategory.id) {
            const docRef = doc(firestore, 'store_categories', currentStoreCategory.id);
            await updateDoc(docRef, categoryData);
            toast({ title: "تم التحديث بنجاح" });
        } else {
            const newDocRef = doc(collection(firestore, 'store_categories'));
            const fullData = { ...categoryData, categoryId: newDocRef.id };
            await setDoc(newDocRef, fullData);
            toast({ title: "تمت الإضافة بنجاح" });
        }
        setStoreCatDialogOpen(false);
    } catch (error) {
        console.error("Error saving store category: ", error);
        toast({ variant: 'destructive', title: "حدث خطأ" });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Handlers for Product Categories
  const handleOpenProdCatDialog = (category: Partial<ProductCategory> | null = null) => {
    setCurrentProdCategory(category ? { ...category } : { sortOrder: 0, image_url: '', storeId: '' });
    setProdCatImagePreview(category?.image_url || '');
    setProdCatDialogOpen(true);
  };

  const handleProdCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentProdCategory) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const categoryData: Omit<ProductCategory, 'id' | 'productCategoryId'> = {
        name_ar: formData.get('name_ar') as string,
        storeId: currentProdCategory.storeId!,
        sortOrder: parseInt(formData.get('sortOrder') as string || '0', 10),
        image_url: formData.get('image_url') as string,
    };

    if (!categoryData.storeId) {
        toast({ variant: 'destructive', title: "خطأ", description: "الرجاء اختيار متجر." });
        setIsSubmitting(false);
        return;
    }

    try {
        if (currentProdCategory?.id) {
            const docRef = doc(firestore, 'product_categories', currentProdCategory.id);
            await updateDoc(docRef, categoryData);
            toast({ title: "تم التحديث بنجاح" });
        } else {
            const newDocRef = doc(collection(firestore, 'product_categories'));
            const fullData = { ...categoryData, productCategoryId: newDocRef.id };
            await setDoc(newDocRef, fullData);
            toast({ title: "تمت الإضافة بنجاح" });
        }
        setProdCatDialogOpen(false);
    } catch (error) {
        console.error("Error saving product category: ", error);
        toast({ variant: 'destructive', title: "حدث خطأ" });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Generic Delete Handler
  const openDeleteDialog = (id: string, name: string, type: 'store' | 'product') => {
    setItemToDelete({ id, name, type });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!firestore || !itemToDelete) return;
    
    const { id, type } = itemToDelete;
    const collectionName = type === 'store' ? 'store_categories' : 'product_categories';

    try {
        await deleteDoc(doc(firestore, collectionName, id));
        toast({ title: "تم الحذف بنجاح" });
    } catch (error) {
        console.error("Error deleting item:", error);
        toast({ variant: 'destructive', title: "خطأ في الحذف" });
    } finally {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    }
  };

  const dbError = storeCategoriesError || productCategoriesError || storesError;
  if (dbError) return <SetupFirestoreMessage />;
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة الفئات</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إدارة فئات المتاجر وأقسام المنتجات الداخلية.</p>
        </div>
        <Button 
            onClick={() => activeTab === 'store_categories' ? handleOpenStoreCatDialog() : handleOpenProdCatDialog()} 
            className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle className="w-4 h-4" />
          {activeTab === 'store_categories' ? 'إضافة فئة متجر' : 'إضافة قسم منتج'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="store_categories">فئات المتاجر الرئيسية</TabsTrigger>
          <TabsTrigger value="product_categories">أقسام المنتجات (المنيو)</TabsTrigger>
        </TabsList>
        <TabsContent value="store_categories">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-gray-50">
                    <CardTitle className="text-sm font-black flex items-center gap-2"><AppWindow className="h-4 w-4 text-primary" /> الفئات الرئيسية للمتاجر</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                <TableHead className="px-6 py-4 text-center">الصورة</TableHead>
                                <TableHead className="px-6 py-4 text-center">الفئة (العربية)</TableHead>
                                <TableHead className="px-6 py-4 text-center">الحالة</TableHead>
                                <TableHead className="px-6 py-4 text-center">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-50">
                            {storeCategoriesLoading ? Array.from({length: 3}).map((_, i) => <RowSkeleton key={i}/>)
                            : storeCategories?.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="px-6 py-4 text-center">
                                      <Image src={cat.image_url} alt={cat.name_ar} width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100 mx-auto"/>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-center font-bold text-xs text-gray-700">{cat.name_ar}</TableCell>
                                    <TableCell className="px-6 py-4 text-center">
                                        <Badge className={cn("rounded-xl border-none font-black px-3 py-1 text-[9px]", cat.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                                            {cat.is_active ? 'نشطة' : 'غير نشطة'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 flex justify-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenStoreCatDialog(cat)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => openDeleteDialog(cat.id!, cat.name_ar, 'store')}><Trash2 className="w-4 h-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="product_categories">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-gray-50">
                    <CardTitle className="text-sm font-black flex items-center gap-2"><Pizza className="h-4 w-4 text-primary" /> أقسام المنتجات (المنيو)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                <TableHead className="px-6 py-4 text-center">الصورة</TableHead>
                                <TableHead className="px-6 py-4 text-center">اسم القسم</TableHead>
                                <TableHead className="px-6 py-4 text-center">المتجر</TableHead>
                                <TableHead className="px-6 py-4 text-center">الترتيب</TableHead>
                                <TableHead className="px-6 py-4 text-center">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-50">
                        {productCategoriesLoading || storesLoading ? Array.from({length: 4}).map((_, i) => <RowSkeleton key={i}/>)
                            : productCategories?.map((cat) => (
                                <TableRow key={cat.id}>
                                     <TableCell className="px-6 py-4 text-center">
                                      <Image src={cat.image_url} alt={cat.name_ar} width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100 mx-auto"/>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-center font-bold text-xs text-gray-700">{cat.name_ar}</TableCell>
                                    <TableCell className="px-6 py-4 text-center font-bold text-xs text-gray-500">{getStoreName(cat.storeId)}</TableCell>
                                    <TableCell className="px-6 py-4 text-center font-bold text-xs text-gray-500">{cat.sortOrder}</TableCell>
                                    <TableCell className="px-6 py-4 flex justify-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenProdCatDialog(cat)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => openDeleteDialog(cat.id!, cat.name_ar, 'product')}><Trash2 className="w-4 h-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      {/* Store Category Dialog */}
      <Dialog open={isStoreCatDialogOpen} onOpenChange={setStoreCatDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
           <form onSubmit={handleStoreCategorySubmit}>
            <DialogHeader>
                <DialogTitle className="font-black text-gray-900">{currentStoreCategory?.id ? 'تعديل فئة' : 'إضافة فئة متجر جديدة'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-6">
                <div className="space-y-2"><Label>اسم الفئة</Label><Input name="name_ar" defaultValue={currentStoreCategory?.name_ar} required className="rounded-lg bg-gray-50" /></div>
                <div className="space-y-2"><Label>رابط الصورة</Label><Input name="image_url" defaultValue={currentStoreCategory?.image_url} placeholder="https://example.com/image.png" required className="rounded-lg bg-gray-50" dir="ltr" onChange={(e) => setStoreCatImagePreview(e.target.value)} /></div>
                {storeCatImagePreview && (
                    <div className="flex justify-center p-2 border rounded-xl bg-gray-50/50">
                        <Image src={storeCatImagePreview} alt="معاينة الصورة" width={100} height={100} className="rounded-lg object-cover"/>
                    </div>
                )}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Label htmlFor="store-cat-active" className="font-bold text-gray-700 w-32 text-right">{currentStoreCategory?.is_active ? 'الفئة نشطة' : 'الفئة غير نشطة'}</Label>
                    <Switch id="store-cat-active" checked={currentStoreCategory?.is_active} onCheckedChange={(checked) => setCurrentStoreCategory(prev => ({...prev, is_active: checked}))} dir="ltr"/>
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="rounded-lg font-black">{isSubmitting ? <Loader2 className="animate-spin"/> : 'حفظ'}</Button>
                <DialogClose asChild><Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button></DialogClose>
            </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
      
      {/* Product Category Dialog */}
      <Dialog open={isProdCatDialogOpen} onOpenChange={setProdCatDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
           <form onSubmit={handleProdCategorySubmit}>
            <DialogHeader>
                <DialogTitle className="font-black text-gray-900">{currentProdCategory?.id ? 'تعديل قسم' : 'إضافة قسم منتجات جديد'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-6">
                <div className="space-y-2"><Label>اسم القسم (مثال: مشويات)</Label><Input name="name_ar" defaultValue={currentProdCategory?.name_ar} required className="rounded-lg bg-gray-50" /></div>
                 <div className="space-y-2"><Label>رابط الصورة</Label><Input name="image_url" defaultValue={currentProdCategory?.image_url} placeholder="https://example.com/image.png" required className="rounded-lg bg-gray-50" dir="ltr" onChange={(e) => setProdCatImagePreview(e.target.value)} /></div>
                {prodCatImagePreview && (
                    <div className="flex justify-center p-2 border rounded-xl bg-gray-50/50">
                        <Image src={prodCatImagePreview} alt="معاينة الصورة" width={100} height={100} className="rounded-lg object-cover"/>
                    </div>
                )}
                <div className="space-y-2">
                    <Label>المتجر التابع له</Label>
                    <Select
                        key={currentProdCategory?.id || 'new'}
                        dir="rtl"
                        required
                        value={currentProdCategory?.storeId || ''}
                        onValueChange={(val) => setCurrentProdCategory(prev => ({ ...prev, storeId: val }))}
                    >
                        <SelectTrigger className="rounded-lg font-bold bg-gray-50"><SelectValue placeholder="اختر المتجر" /></SelectTrigger>
                        <SelectContent className="rounded-lg">
                            {storesLoading ? (
                                <SelectItem value="loading" disabled>جاري جلب قائمة المتاجر...</SelectItem>
                            ) : stores && stores.length > 0 ? (
                                stores.map(store => <SelectItem key={store.id} value={store.storeId}>{store.name_ar}</SelectItem>)
                            ) : (
                                <div className="p-2 text-center text-sm text-muted-foreground">لا يوجد متاجر مضافة حالياً.</div>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2"><Label>رقم الترتيب (للظهور)</Label><Input name="sortOrder" type="number" defaultValue={currentProdCategory?.sortOrder || 0} required className="rounded-lg bg-gray-50" dir="ltr" /></div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isSubmitting || storesLoading} className="rounded-lg font-black">{isSubmitting ? <Loader2 className="animate-spin"/> : 'حفظ'}</Button>
                <DialogClose asChild><Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button></DialogClose>
            </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف "{itemToDelete?.name}" بشكل نهائي.</AlertDialogDescription>
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

    