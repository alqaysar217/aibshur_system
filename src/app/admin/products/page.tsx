'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFirestore, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { Product, Store, ProductCategory, ProductVariant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { PlusCircle, Edit, Trash2, Loader2, Package, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { mockAdminUser } from '@/lib/mock-data';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={7} className="p-0">
            <Skeleton className="w-full h-[70px]"/>
        </TableCell>
    </TableRow>
);

export default function AdminProductsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [productCategoriesLoading, setProductCategoriesLoading] = useState(true);

  const [filteredCategories, setFilteredCategories] = useState<ProductCategory[]>([]);

  const productsQuery = useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products, loading: productsLoading, error: productsError } = useCollection<Product>(productsQuery, 'products');

  const dataLoading = storesLoading || productCategoriesLoading;

  useEffect(() => {
    if (!firestore) {
      setStoresLoading(false);
      setProductCategoriesLoading(false);
      return;
    }
    
    const fetchDropdownData = async () => {
      try {
        const storesPromise = getDocs(collection(firestore, 'stores'));
        const categoriesPromise = getDocs(collection(firestore, 'product_categories'));
        
        const [storesSnapshot, categoriesSnapshot] = await Promise.all([storesPromise, categoriesPromise]);
        
        setStores(storesSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Store)));
        setProductCategories(categoriesSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as ProductCategory)));

      } catch (error) {
        console.error("Error fetching stores or categories:", error);
        toast({ variant: 'destructive', title: "خطأ في جلب البيانات" });
      } finally {
        setStoresLoading(false);
        setProductCategoriesLoading(false);
      }
    };
    
    fetchDropdownData();
  }, [firestore, toast]);
  
  useEffect(() => {
    if (currentProduct?.storeId && productCategories.length > 0) {
      setFilteredCategories(productCategories.filter(c => c.storeId === currentProduct.storeId));
    } else {
      setFilteredCategories([]);
    }
  }, [currentProduct?.storeId, productCategories]);

  const getStoreName = useCallback((storeId: string) => {
    return stores.find(s => s.id === storeId)?.name_ar || '...';
  }, [stores]);
  
  const getCategoryName = useCallback((catId: string) => {
    return productCategories.find(c => c.id === catId)?.name_ar || '...';
  }, [productCategories]);
  
  const handleOpenDialog = (product: Partial<Product> | null = null) => {
    if (product) {
      setCurrentProduct({ ...product });
      setImagePreview(product.main_image_url || '');
      setHasVariants(!!product.variants && product.variants.length > 0);
    } else {
      setCurrentProduct({ 
        is_active: true,
        base_price: 0,
        storeOwnerUid: mockAdminUser.uid,
        variants: []
      });
      setImagePreview('');
      setHasVariants(false);
    }
    setDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentProduct) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    if (!currentProduct.storeId || !currentProduct.productCategoryId) {
      toast({ variant: 'destructive', title: "بيانات ناقصة", description: "الرجاء اختيار المتجر وقسم المنتج." });
      setIsSubmitting(false);
      return;
    }
    
    const nameAr = formData.get('name_ar') as string;
    const descAr = formData.get('description_ar') as string;
    
    const productData: Partial<Product> = {
      ...currentProduct,
      name_ar: nameAr,
      name_en: nameAr.toLowerCase().replace(/\s+/g, '-'),
      description_ar: descAr,
      description_en: descAr,
      main_image_url: formData.get('main_image_url') as string,
      base_price: hasVariants ? undefined : parseFloat(formData.get('base_price') as string),
      variants: hasVariants ? currentProduct.variants : [],
      rating: parseFloat(formData.get('rating') as string) || 5,
    };
    
    let docRef;

    try {
      if (currentProduct.id) {
        docRef = doc(firestore, 'products', currentProduct.id);
        await updateDoc(docRef, productData);
        toast({ title: "تم التحديث بنجاح" });
      } else {
        docRef = doc(collection(firestore, 'products'));
        const fullData: Product = {
            ...productData,
            productId: docRef.id,
        } as Product;
        await setDoc(docRef, fullData);
        toast({ title: "تمت الإضافة بنجاح" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving product:", error);
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: docRef!.path,
          operation: currentProduct.id ? 'update' : 'create',
          requestResourceData: productData
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({ variant: 'destructive', title: "حدث خطأ" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firestore || !productToDelete) return;
    const docRef = doc(firestore, 'products', productToDelete.id!);
    try {
      await deleteDoc(docRef);
      toast({ title: "تم الحذف بنجاح" });
    } catch (error: any) {
      console.error("Error deleting product:", error);
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

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'products', productId);
    try {
      await updateDoc(docRef, { is_active: !currentStatus });
      toast({ title: `تم ${!currentStatus ? 'تفعيل' : 'إخفاء'} المنتج`});
    } catch (error: any) {
      console.error("Error toggling active status: ", error);
      toast({ variant: 'destructive', title: 'فشل تغيير الحالة' });
    }
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    setCurrentProduct(prev => {
        if (!prev || !prev.variants) return prev;
        const newVariants = [...prev.variants];
        // @ts-ignore
        newVariants[index][field] = value;
        return { ...prev, variants: newVariants };
    });
  }

  const addVariant = () => {
    setCurrentProduct(prev => {
        if (!prev) return prev;
        const newVariant: ProductVariant = { variantId: `var_${Date.now()}`, name_ar: '', price: 0 };
        const variants = prev.variants ? [...prev.variants, newVariant] : [newVariant];
        return { ...prev, variants };
    });
  }

  const removeVariant = (index: number) => {
    setCurrentProduct(prev => {
        if (!prev || !prev.variants) return prev;
        const newVariants = prev.variants.filter((_, i) => i !== index);
        return { ...prev, variants: newVariants };
    });
  }


  if (productsError) {
    if (productsError.message.includes('database (default) does not exist') || productsError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p>خطأ: {productsError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المنتجات</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إضافة وتعديل وحذف أصناف المنتجات في المتاجر.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle /> إضافة منتج جديد
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50">
          <CardTitle className="text-sm font-black flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> قائمة المنتجات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="text-center w-[250px]">المنتج</TableHead>
                <TableHead className="text-center">المتجر</TableHead>
                <TableHead className="text-center">القسم</TableHead>
                <TableHead className="text-center">السعر</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center w-[120px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {productsLoading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                : products?.map((prod) => (
                    <TableRow key={prod.id}>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-start gap-3 text-right">
                           <Image src={prod.main_image_url} alt={prod.name_ar} width={48} height={48} className="w-12 h-12 rounded-md object-cover bg-gray-100" />
                           <span className="font-bold text-xs text-gray-700">{prod.name_ar}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-gray-500">{getStoreName(prod.storeId)}</TableCell>
                      <TableCell className="text-center font-bold text-xs text-gray-500">{getCategoryName(prod.productCategoryId)}</TableCell>
                      <TableCell className="text-center font-bold text-xs text-gray-700">
                        {prod.variants && prod.variants.length > 0 ? (
                            <Badge variant="outline" className="font-black">خيارات متعددة</Badge>
                        ) : `${prod.base_price || 0} ر.ي` }
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                            checked={prod.is_active}
                            onCheckedChange={() => handleToggleActive(prod.id!, prod.is_active)}
                            aria-label="Toggle product status"
                        />
                      </TableCell>
                      <TableCell className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(prod)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleOpenDeleteDialog(prod)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-2xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="font-black text-gray-900">{currentProduct?.id ? 'تعديل منتج' : 'إضافة منتج جديد'}</DialogTitle>
              <DialogDescription>املأ تفاصيل المنتج أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-6 max-h-[70vh] overflow-y-auto pr-2 pl-4">
              
              {/* --- Left Column --- */}
              <div className="space-y-4">
                <div className="space-y-2"><Label>اسم المنتج</Label><Input name="name_ar" defaultValue={currentProduct?.name_ar} required className="rounded-lg bg-gray-50" /></div>
                <div className="space-y-2"><Label>وصف المنتج</Label><Textarea name="description_ar" defaultValue={currentProduct?.description_ar} required className="rounded-lg bg-gray-50" rows={3} /></div>
                 <div className="space-y-2"><Label>رابط صورة المنتج الرئيسية</Label><Input name="main_image_url" defaultValue={currentProduct?.main_image_url} placeholder="https://..." required className="rounded-lg bg-gray-50" dir="ltr" onChange={(e) => setImagePreview(e.target.value)} /></div>
                  {imagePreview && (imagePreview.startsWith('http') || imagePreview.startsWith('/')) && (
                      <div className="flex justify-center p-2 border rounded-xl bg-gray-50/50">
                          <Image src={imagePreview} alt="معاينة الصورة" width={120} height={120} className="rounded-lg object-cover"/>
                      </div>
                  )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المتجر</Label>
                      <select
                          required
                          disabled={dataLoading}
                          value={currentProduct?.storeId || ''}
                          onChange={(e) => {
                            setCurrentProduct(prev => ({ ...prev, storeId: e.target.value, productCategoryId: '' }));
                            setFilteredCategories(productCategories.filter(c => c.storeId === e.target.value));
                          }}
                          className="h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                      >
                          <option value="" disabled>اختر المتجر...</option>
                          {stores.map(store => <option key={store.id} value={store.id!}>{store.name_ar}</option>)}
                      </select>
                  </div>
                   <div className="space-y-2">
                      <Label>قسم المنتج</Label>
                      <select
                          required
                          disabled={dataLoading || !currentProduct?.storeId}
                          value={currentProduct?.productCategoryId || ''}
                          onChange={(e) => setCurrentProduct(prev => ({ ...prev, productCategoryId: e.target.value }))}
                          className="h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                      >
                           <option value="" disabled>اختر القسم...</option>
                           {filteredCategories.map(cat => <option key={cat.id} value={cat.id!}>{cat.name_ar}</option>)}
                      </select>
                  </div>
                </div>
                 <div className="flex items-center justify-between gap-3 pt-2 bg-gray-50 p-3 rounded-lg">
                      <Label htmlFor="is_active" className="font-bold text-gray-700">{currentProduct?.is_active ? 'المنتج ظاهر للعملاء' : 'المنتج مخفي'}</Label>
                      <Switch id="is_active" checked={currentProduct?.is_active} onCheckedChange={(checked) => setCurrentProduct(prev => ({...prev, is_active: checked}))} dir="ltr"/>
                  </div>
              </div>
              
               {/* --- Right Column --- */}
              <div className="space-y-4 border-r pr-8">
                 <div className="flex items-center justify-between gap-3 bg-gray-100 p-3 rounded-lg">
                    <Label htmlFor="has-variants" className="font-bold text-gray-800">هل للمنتج أنواع/أحجام متعددة؟</Label>
                    <Switch id="has-variants" checked={hasVariants} onCheckedChange={setHasVariants} dir="ltr"/>
                </div>

                {!hasVariants ? (
                    <div className="space-y-2 animate-in fade-in duration-300">
                        <Label>السعر الأساسي للمنتج (ر.ي)</Label>
                        <Input name="base_price" type="number" defaultValue={currentProduct?.base_price} required className="rounded-lg bg-gray-50" dir="ltr" />
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <Label className="font-bold text-lg">خيارات المنتج</Label>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {currentProduct?.variants?.map((variant, index) => (
                            <div key={index} className="p-3 border rounded-lg bg-gray-50/50 space-y-3 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 left-1 h-7 w-7 text-red-500" onClick={() => removeVariant(index)}><X className="w-4 h-4"/></Button>
                                <div className="grid grid-cols-2 gap-x-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">اسم الخيار (مثال: كبير)</Label>
                                    <Input value={variant.name_ar} onChange={e => handleVariantChange(index, 'name_ar', e.target.value)} className="h-9"/>
                                  </div>
                                   <div className="space-y-1">
                                    <Label className="text-xs">السعر (ر.ي)</Label>
                                    <Input value={variant.price} type="number" onChange={e => handleVariantChange(index, 'price', e.target.valueAsNumber)} className="h-9" dir="ltr"/>
                                  </div>
                                </div>
                                 <div className="space-y-1">
                                    <Label className="text-xs">رابط صورة الخيار (اختياري)</Label>
                                    <Input value={variant.image_url || ''} onChange={e => handleVariantChange(index, 'image_url', e.target.value)} className="h-9" dir="ltr"/>
                                  </div>
                                {variant.image_url && (variant.image_url.startsWith('http') || variant.image_url.startsWith('/')) && (
                                    <div className="flex justify-center">
                                    <Image src={variant.image_url} alt="variant preview" width={60} height={60} className="rounded-md object-cover"/>
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>
                        <Button type="button" variant="outline" className="w-full font-bold" onClick={addVariant}><Plus className="w-4 h-4 ml-2"/> إضافة خيار جديد</Button>
                    </div>
                )}
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
            <AlertDialogDescription>سيتم حذف المنتج "{productToDelete?.name_ar}" بشكل نهائي.</AlertDialogDescription>
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
