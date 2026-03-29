'use client';
import { useState, useMemo, useCallback } from 'react';
import { useFirestore, useUser, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, where, getDocs, runTransaction, serverTimestamp, orderBy, writeBatch, Timestamp, limit, addDoc } from 'firebase/firestore';
import type { WalletTopupRequest, User, AppBank } from '@/lib/types';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, Loader2, WalletCards, Undo, Search, UserCheck, UserX, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={7} className="p-0">
            <Skeleton className="w-full h-[70px]"/>
        </TableCell>
    </TableRow>
);

export default function WalletRequestsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [requestToRevert, setRequestToRevert] = useState<WalletTopupRequest | null>(null);

  // Data fetching for selects and logs
  const banksQuery = useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]);
  const { data: banks, loading: banksLoading, error: banksError } = useCollection<AppBank>(banksQuery, 'app_banks');

  const requestsQuery = useMemo(() => firestore ? query(collection(firestore, 'wallet_transactions'), orderBy('timestamp', 'desc'), limit(20)) : null, [firestore]);
  const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<WalletTopupRequest>(requestsQuery, 'wallet_transactions');

  const handleSearchUser = async () => {
    if (!firestore || !searchPhone) {
        setFoundUser(null);
        return;
    }
    setIsSearching(true);
    setFoundUser(null);
    try {
        const userQuery = query(collection(firestore, 'users'), where('phone', '==', searchPhone), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            toast({ variant: 'destructive', title: 'غير موجود', description: 'لا يوجد مستخدم بهذا الرقم.' });
        } else {
            const user = userSnapshot.docs[0].data() as User;
            setFoundUser(user);
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'خطأ في البحث' });
    } finally {
        setIsSearching(false);
    }
  }

  const handleConfirmDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore || !adminUser || !foundUser || !amount || !selectedBankId || !receiptImage) {
          toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'الرجاء ملء جميع الحقول المطلوبة.' });
          return;
      }
      setIsSubmitting(true);

      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
          toast({ variant: 'destructive', title: 'مبلغ غير صالح', description: 'الرجاء إدخال مبلغ صحيح.' });
          setIsSubmitting(false);
          return;
      }
      
      const transactionId = `manual_${Date.now()}`;
      
      try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', foundUser.uid);
            const userDoc = await transaction.get(userDocRef);
            
            if (!userDoc.exists()) {
                throw new Error("المستخدم لم يعد موجوداً.");
            }
            
            const currentBalance = userDoc.data().wallet_balance || 0;
            const newBalance = currentBalance + depositAmount;
            
            transaction.update(userDocRef, { wallet_balance: newBalance });
            
            const requestDocRef = doc(firestore, 'wallet_transactions', transactionId);
            const newRequest: WalletTopupRequest = {
                id: transactionId,
                transactionId: transactionId,
                userId: foundUser.uid,
                user_name: foundUser.full_name || 'N/A',
                user_phone: foundUser.phone,
                amount: depositAmount,
                receipt_number: receiptNumber,
                receipt_image: receiptImage,
                bank_id: selectedBankId,
                status: 'approved',
                timestamp: new Date().toISOString(),
                processed_by: adminUser.uid,
                processed_at: new Date().toISOString(),
            };
            transaction.set(requestDocRef, newRequest);
        });

        toast({ title: 'تم الإيداع بنجاح!', description: `تم إضافة ${depositAmount} ر.ي إلى محفظة ${foundUser.full_name}.` });
        // Reset form
        setFoundUser(null);
        setSearchPhone('');
        setAmount('');
        setReceiptNumber('');
        setReceiptImage('');
        setSelectedBankId('');

      } catch (error: any) {
        console.error("Deposit transaction failed:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
  }

  const handleRevert = async () => {
    if (!firestore || !requestToRevert || !adminUser) return;
    setIsSubmitting(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', requestToRevert.userId);
            const requestDocRef = doc(firestore, 'wallet_transactions', requestToRevert.id);
            
            const [userDoc, requestDoc] = await Promise.all([transaction.get(userDocRef), transaction.get(requestDocRef)]);
            
            if (!userDoc.exists() || !requestDoc.exists()) throw new Error("المستخدم أو الطلب غير موجود.");
            
            const reqData = requestDoc.data() as WalletTopupRequest;
            if (reqData.status === 'rejected') throw new Error("لا يمكن التراجع عن عملية مرفوضة أو متراجع عنها مسبقاً.");

            const currentBalance = userDoc.data().wallet_balance || 0;
            const newBalance = currentBalance - reqData.amount;
            if (newBalance < 0) throw new Error("رصيد العميل لا يسمح بإجراء عملية التراجع.");

            transaction.update(userDocRef, { wallet_balance: newBalance });
            transaction.update(requestDocRef, { 
                status: 'rejected',
                rejection_reason: `تم التراجع عنها بواسطة المدير: ${adminUser.full_name}`,
                processed_by: adminUser.uid,
                processed_at: new Date().toISOString(),
             });
        });
        toast({ title: 'تم التراجع عن العملية', description: `تم خصم المبلغ من رصيد العميل.` });
        setRequestToRevert(null);
    } catch (error: any) {
        console.error("Revert failed:", error);
        toast({ variant: 'destructive', title: 'فشل التراجع', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const loading = requestsLoading || banksLoading;
  const dbError = requestsError || banksError;

  if (dbError) {
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center p-8">خطأ: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
            <CardTitle>إيداع رصيد يدوي لعميل</CardTitle>
            <CardDescription>هذه الواجهة مخصصة لخدمة العملاء لإضافة رصيد بعد التحقق من سند التحويل المستلم عبر واتساب.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleConfirmDeposit} className='space-y-6'>
                <div className='p-4 border rounded-xl space-y-4'>
                    <Label className='font-bold'>1. البحث عن العميل</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="tel"
                            placeholder="ابحث برقم هاتف العميل..."
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            className='max-w-xs'
                            dir='ltr'
                        />
                        <Button type="button" onClick={handleSearchUser} disabled={isSearching || !searchPhone}>
                            {isSearching ? <Loader2 className="animate-spin w-4 h-4"/> : <Search className='w-4 h-4'/>}
                            بحث
                        </Button>
                    </div>
                     {foundUser && (
                        <div className="p-3 border rounded-lg bg-green-50 flex items-center justify-between animate-in fade-in duration-300">
                             <div className="flex items-center gap-3">
                                <UserCheck className='w-8 h-8 text-green-600'/>
                                <div>
                                    <p className="font-bold text-sm text-green-800">{foundUser.full_name}</p>
                                    <p className="text-xs text-green-600 font-mono" dir='ltr'>{foundUser.phone}</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => {setFoundUser(null); setSearchPhone('')}}>
                                <UserX className="w-4 h-4"/>
                            </Button>
                        </div>
                    )}
                </div>
                
                {foundUser && (
                    <div className='animate-in fade-in duration-500 space-y-6'>
                        <div className='p-4 border rounded-xl space-y-4'>
                             <Label className='font-bold'>2. تفاصيل الإيداع</Label>
                             <div className='grid md:grid-cols-2 gap-4'>
                                <div className='space-y-2'><Label>المبلغ (بالريال اليمني)</Label><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} required dir='ltr' /></div>
                                <div className='space-y-2'><Label>رقم السند البنكي</Label><Input value={receiptNumber} onChange={e=>setReceiptNumber(e.target.value)} required dir='ltr' /></div>
                             </div>
                              <div className='space-y-2'><Label>رابط صورة السند (من الواتساب)</Label><Input type='url' value={receiptImage} onChange={e=>setReceiptImage(e.target.value)} required dir='ltr' placeholder='https://...' /></div>
                              <div className='space-y-2'><Label>تم الإيداع في بنك</Label>
                                <select
                                    required
                                    value={selectedBankId}
                                    onChange={(e) => setSelectedBankId(e.target.value)}
                                    disabled={banksLoading}
                                    className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                                >
                                    <option value="" disabled>اختر حساب البنك...</option>
                                    {banks?.map(bank => <option key={bank.id} value={bank.id!}>{bank.bank_name} ({bank.account_number})</option>)}
                                </select>
                              </div>
                        </div>
                        <Button type="submit" className='w-full h-12 text-lg font-black' disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'تأكيد الإيداع وإضافة الرصيد'}
                        </Button>
                    </div>
                )}
            </form>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden mt-4">
            <CardHeader className="p-6 border-b border-gray-50">
            <CardTitle className="text-sm font-black flex items-center gap-2"><WalletCards className="h-4 w-4 text-primary" /> سجل عمليات الإيداع اليدوية</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">رقم السند</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center w-[120px]">إجراءات</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                {loading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                    : requests?.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className='h-48 text-center text-muted-foreground font-bold'>
                                <FileWarning className='mx-auto w-12 h-12 text-gray-300 mb-2'/>
                                لا توجد عمليات إيداع مسجلة بعد.
                            </TableCell>
                        </TableRow>
                    )
                    : requests?.map((req) => (
                        <TableRow key={req.id} className={cn("hover:bg-muted/50", req.status === 'rejected' && 'bg-red-50/50')}>
                        <TableCell>
                            <div className='font-bold text-xs'>
                                <p className='text-gray-800'>{req.user_name}</p>
                                <p className='text-gray-400 font-mono' dir='ltr'>{req.user_phone}</p>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg text-primary">{req.amount.toLocaleString()}<span className='text-xs'> ر.ي</span></TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">{req.receipt_number}</TableCell>
                        <TableCell className="text-center font-bold">
                            <Badge className={cn('font-black text-xs', 
                                req.status === 'approved' && 'bg-green-100 text-green-800',
                                req.status === 'rejected' && 'bg-red-100 text-red-800',
                            )}>
                                {req.status === 'approved' ? 'مؤكدة' : 'تم التراجع عنها'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-gray-500">
                           {format(new Date(req.timestamp), 'dd MMM yyyy, hh:mm a', { locale: ar })}
                        </TableCell>
                        <TableCell className="text-center">
                            {req.status === 'approved' && (
                                <Button size='sm' variant='ghost' className='h-8 font-bold text-amber-600 gap-1' onClick={() => setRequestToRevert(req)} disabled={isSubmitting}>
                                    <Undo className='w-4 h-4'/>
                                    تراجع
                                </Button>
                            )}
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      
      <AlertDialog open={!!requestToRevert} onOpenChange={(open) => !open && setRequestToRevert(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>تأكيد التراجع عن العملية</AlertDialogTitle>
            <AlertDialogDescription>
                هل أنت متأكد من رغبتك في التراجع عن هذه العملية؟ سيتم خصم مبلغ {requestToRevert?.amount} ر.ي من محفظة العميل فوراً.
                هذا الإجراء لا يمكن إلغاؤه.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToRevert(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} className='bg-destructive hover:bg-destructive/90' disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className='animate-spin w-4 h-4' /> : 'نعم، قم بالتراجع'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
