'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { AppBank } from '@/lib/types';
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
import { PlusCircle, Edit, Trash2, Loader2, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={6} className="p-0">
            <Skeleton className="w-full h-[70px]"/>
        </TableCell>
    </TableRow>
);

export default function BankAccountsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentBank, setCurrentBank] = useState<Partial<AppBank> | null>(null);
  const [bankToDelete, setBankToDelete] = useState<AppBank | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const banksQuery = useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]);
  const { data: banks, loading: banksLoading, error: banksError } = useCollection<AppBank>(banksQuery, 'app_banks');

  const handleOpenDialog = (bank: Partial<AppBank> | null = null) => {
    setCurrentBank(bank ? { ...bank } : { is_active: true });
    setLogoPreview(bank?.bank_logo || '');
    setDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (bank: AppBank) => {
    setBankToDelete(bank);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentBank) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    let bankData: Partial<Omit<AppBank, 'id' | 'bankId'>> = {
      bank_name: formData.get('bank_name') as string,
      account_holder: formData.get('account_holder') as string,
      account_number: formData.get('account_number') as string,
      iban: formData.get('iban') as string,
      bank_logo: formData.get('bank_logo') as string,
      is_active: currentBank.is_active,
    };

    if (!bankData.bank_name || !bankData.account_holder || !bankData.account_number || !bankData.bank_logo) {
        toast({ variant: 'destructive', title: "بيانات ناقصة", description: "الرجاء تعبئة الحقول الإلزامية." });
        setIsSubmitting(false);
        return;
    }
    
    let docRef;

    try {
      if (currentBank.id) {
        docRef = doc(firestore, 'app_banks', currentBank.id);
        await updateDoc(docRef, bankData);
        toast({ title: "تم التحديث بنجاح" });
      } else {
        docRef = doc(collection(firestore, 'app_banks'));
        const fullData: AppBank = {
            ...(bankData as Omit<AppBank, 'id' | 'bankId'>),
            bankId: docRef.id,
        };
        await setDoc(docRef, fullData);
        toast({ title: "تمت الإضافة بنجاح" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving bank account:", error);
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: docRef!.path,
          operation: currentBank.id ? 'update' : 'create',
          requestResourceData: bankData
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
    if (!firestore || !bankToDelete) return;
    const docRef = doc(firestore, 'app_banks', bankToDelete.id!);
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

  const handleToggleActive = async (bankId: string, currentStatus: boolean) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'app_banks', bankId);
    try {
      await updateDoc(docRef, { is_active: !currentStatus });
      toast({ title: `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الحساب`});
    } catch (error: any) {
      console.error("Error toggling active status: ", error);
      toast({ variant: 'destructive', title: 'فشل تغيير الحالة' });
    }
  }

  if (banksError) {
    if (banksError.message.includes('database (default) does not exist') || banksError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center">خطأ: {banksError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة الحسابات البنكية</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">إدارة الحسابات التي تستخدم لاستقبال المدفوعات.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle /> إضافة حساب بنكي
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50">
          <CardTitle className="text-sm font-black flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> قائمة الحسابات البنكية</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="text-right w-[250px]">اسم البنك</TableHead>
                <TableHead className="text-center">صاحب الحساب</TableHead>
                <TableHead className="text-center">رقم الحساب</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center w-[150px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {banksLoading ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : banks?.map((bank) => (
                    <TableRow key={bank.id} className="hover:bg-muted/50">
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-3">
                           {bank.bank_logo && (bank.bank_logo.startsWith('http') || (bank.bank_logo.startsWith('/') && !bank.bank_logo.startsWith('//'))) ? (
                             <Image src={bank.bank_logo} alt={bank.bank_name} width={40} height={40} className="w-10 h-10 rounded-md object-contain bg-gray-100 p-1" />
                           ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 p-1">
                                <Banknote className="h-6 w-6 text-gray-400" />
                            </div>
                           )}
                           <span className="font-bold text-xs text-gray-700">{bank.bank_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle font-bold text-xs text-gray-500">{bank.account_holder}</TableCell>
                      <TableCell className="text-center align-middle font-mono text-xs text-gray-700" dir="ltr">{bank.account_number}</TableCell>
                      <TableCell className="text-center align-middle">
                        <Switch checked={bank.is_active} onCheckedChange={() => handleToggleActive(bank.id!, bank.is_active)} />
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(bank)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleOpenDeleteDialog(bank)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="font-black text-gray-900">{currentBank?.id ? 'تعديل حساب بنكي' : 'إضافة حساب بنكي جديد'}</DialogTitle>
              <DialogDescription>أدخل تفاصيل الحساب البنكي أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
                <div className="space-y-2"><Label>اسم البنك</Label><Input name="bank_name" defaultValue={currentBank?.bank_name} required className="rounded-lg bg-gray-50"/></div>
                <div className="space-y-2"><Label>اسم صاحب الحساب</Label><Input name="account_holder" defaultValue={currentBank?.account_holder} required className="rounded-lg bg-gray-50"/></div>
                <div className="space-y-2"><Label>رقم الحساب</Label><Input name="account_number" defaultValue={currentBank?.account_number} required className="rounded-lg bg-gray-50" dir="ltr"/></div>
                <div className="space-y-2"><Label>الآيبان (IBAN) - اختياري</Label><Input name="iban" defaultValue={currentBank?.iban} className="rounded-lg bg-gray-50" dir="ltr"/></div>
                <div className="space-y-2"><Label>رابط شعار البنك</Label><Input name="bank_logo" defaultValue={currentBank?.bank_logo} required className="rounded-lg bg-gray-50" dir="ltr" onChange={(e) => setLogoPreview(e.target.value)} /></div>
                {logoPreview && (logoPreview.startsWith('http') || (logoPreview.startsWith('/') && !logoPreview.startsWith('//'))) && (
                    <div className="flex justify-center p-2 border rounded-xl bg-gray-50/50">
                        <Image src={logoPreview} alt="معاينة الشعار" width={100} height={100} className="rounded-lg object-contain h-20"/>
                    </div>
                )}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50">
                    <Label htmlFor="is_active" className="font-bold text-gray-700">{currentBank?.is_active ? 'الحساب مفعل' : 'الحساب معطل'}</Label>
                    <Switch id="is_active" checked={currentBank?.is_active} onCheckedChange={(checked) => setCurrentBank(prev => ({...prev, is_active: checked}))} dir="ltr"/>
                </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg font-black">{isSubmitting ? <Loader2 className="animate-spin"/> : 'حفظ'}</Button>
              <DialogClose asChild><Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button></DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف حساب بنك "{bankToDelete?.bank_name}" بشكل نهائي.</AlertDialogDescription>
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
