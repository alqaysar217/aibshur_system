'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs } from 'firebase/firestore';
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
import { PlusCircle, Edit, Trash2, Loader2, AppWindow, Pizza } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  const { data: storeCategories, loading: storeCategoriesLoading, error: storeCategoriesError } = useCollection<StoreCategory>(storeCategoriesQuery, 'store_categories');

  const productCategoriesQuery = useMemo(() => firestore ? collection(firestore, 'product_categories') : null, [firestore]);
  const { data: productCategories, loading: productCategoriesLoading, error: productCategoriesError } = useCollection<ProductCategory>(productCategoriesQuery, 'product_categories');
 
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore) {
      setStoresLoading(false);
      return;
    }

    const fetchStores = async () => {
      setStoresLoading(true);
      try {
        const storesCollection = collection(firestore, 'stores');
        const querySnapshot = await getDocs(storesCollection);
        const storesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Store));
        setStores(storesData);
        setStoresError(null);
      } catch (error) {
        console.error("Error fetching stores directly:", error);
        setStoresError(error as Error);
      } finally {
        setStoresLoading(false);
      }
    };

    fetchStores();
  }, [firestore]);


  const getStoreName = useCallback((storeId: string) => {
    if (storesLoading) return 'جاري التحميل...';
    const store = stores.find(s => s.id === storeId);
    return store?.name_ar || 'متجر غير معروف';
  }, [stores, storesLoading]);
 
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
   
    let docRef;

    try {
        if (currentStoreCategory.id) {
            docRef = doc(firestore, 'store_categories', currentStoreCategory.id);
            await updateDoc(docRef, categoryData);
            toast({ title: "تم التحديث بنجاح" });
        } else {
            docRef = doc(collection(firestore, 'store_categories'));
            const fullData = { ...categoryData, categoryId: docRef.id };
            await setDoc(docRef, fullData);
            toast({ title: "تمت الإضافة بنجاح" });
        }
        setStoreCatDialogOpen(false);
    } catch (error: any) {
        console.error("Error saving store category: ", error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: docRef!.path,
              operation: currentStoreCategory.id ? 'update' : 'create',
              requestResourceData: categoryData
            });
            errorEmitter.emit('permission-error', permissionError);
          } else {
            toast({ variant: 'destructive', title: "حدث خطأ" });
          }
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
   
    let docRef;

    try {
        if (currentProdCategory?.id) {
            docRef = doc(firestore, 'product_categories', currentProdCategory.id);
            await updateDoc(docRef, categoryData);
            toast({ title: "تم التحديث بنجاح" });
        } else {
            docRef = doc(collection(firestore, 'product_categories'));
            const fullData = { ...categoryData, productCategoryId: docRef.id };
            await setDoc(docRef, fullData);
            toast({ title: "تمت الإضافة بنجاح" });
        }
        setProdCatDialogOpen(false);
    } catch (error: any) {
        console.error("Error saving product category: ", error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: docRef!.path,
              operation: currentProdCategory.id ? 'update' : 'create',
              requestResourceData: categoryData
            });
            errorEmitter.emit('permission-error', permissionError);
          } else {
            toast({ variant: 'destructive', title: "حدث خطأ" });
          }
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
    const docRef = doc(firestore, collectionName, id);

    try {
        await deleteDoc(docRef);
        toast({ title: "تم الحذف بنجاح" });
    } catch (error: any) {
        console.error("Error deleting item:", error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: "خطأ في الحذف" });
        }
    } finally {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    }
  };

  const dbError = storeCategoriesError || productCategoriesError || storesError;
  if (dbError) {
      console.error("Critical Error fetching data for categories page:", dbError);
      if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('Could not reach Firestore backend') || dbError.message.includes('permission-denied') || dbError.message.includes('Missing or insufficient permissions')) {
        return <SetupFirestoreMessage />;
      }
  }
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
                <DialogDescription>املأ تفاصيل الفئة أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
                <div className="space-y-2"><Label>اسم الفئة</Label><Input name="name_ar" defaultValue={currentStoreCategory?.name_ar} required className="rounded-lg bg-gray-50" /></div>
                <div className="space-y-2"><Label>رابط الصورة</Label><Input name="image_url" defaultValue={currentStoreCategory?.image_url} placeholder="https://example.com/image.png" required className="rounded-lg bg-gray-50" dir="ltr" onChange={(e) => setStoreCatImagePreview(e.target.value)} /></div>
                {storeCatImagePreview && (storeCatImagePreview.startsWith('http') || storeCatImagePreview.startsWith('/')) && (
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
                <DialogDescription>املأ تفاصيل قسم المنتج أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
                <div className="space-y-2"><Label>اسم القسم (مثال: مشويات)</Label><Input name="name_ar" defaultValue={currentProdCategory?.name_ar} required className="rounded-lg bg-gray-50" /></div>
                 <div className="space-y-2"><Label>رابط الصورة</Label><Input name="image_url" defaultValue={currentProdCategory?.image_url} placeholder="https://example.com/image.png" required className="rounded-lg bg-gray-50" dir="ltr" onChange={(e) => setProdCatImagePreview(e.target.value)} /></div>
                {prodCatImagePreview && (prodCatImagePreview.startsWith('http') || prodCatImagePreview.startsWith('/')) && (
                    <div className="flex justify-center p-2 border rounded-xl bg-gray-50/50">
                        <Image src={prodCatImagePreview} alt="معاينة الصورة" width={100} height={100} className="rounded-lg object-cover"/>
                    </div>
                )}
                <div className="space-y-2">
                    <Label>المتجر التابع له</Label>
                    <select
                        required
                        disabled={storesLoading}
                        value={currentProdCategory?.storeId || ''}
                        onChange={(e) => setCurrentProdCategory(prev => ({ ...prev, storeId: e.target.value }))}
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                        dir="rtl"
                    >
                        <option value="" disabled>اختر المتجر</option>
                        {storesLoading ? (
                            <option value="loading" disabled>جاري جلب قائمة المتاجر...</option>
                        ) : stores && stores.length > 0 ? (
                            stores.map(store => <option key={store.id} value={store.id!}>{store.name_ar}</option>)
                        ) : (
                            <option disabled>لا يوجد متاجر مضافة حالياً.</option>
                        )}
                    </select>
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
