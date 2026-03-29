'use client';
import { useState, useMemo, useCallback } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, runTransaction, updateDoc } from 'firebase/firestore';
import type { WalletTopupRequest, User, AppBank } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, Loader2, WalletCards, FileWarning, Search, Eye, CircleHelp, CircleX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const [isProcessing, setIsProcessing] = useState<string | null>(null); // To track which request is being processed
  const [requestToReject, setRequestToReject] = useState<WalletTopupRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [receiptToView, setReceiptToView] = useState<string | null>(null);

  const requestsQuery = useMemo(() => firestore ? query(collection(firestore, 'wallet_transactions'), where('status', '==', 'pending')) : null, [firestore]);
  const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<WalletTopupRequest>(requestsQuery, 'wallet_transactions');

  const banksQuery = useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]);
  const { data: banks, loading: banksLoading } = useCollection<AppBank>(banksQuery, 'app_banks');

  const getBankName = useCallback((bankId: string) => {
    if (banksLoading || !banks) return '...';
    return banks.find(b => b.id === bankId)?.bank_name || 'بنك غير معروف';
  }, [banks, banksLoading]);


  const handleApprove = async (request: WalletTopupRequest) => {
    if (!firestore || !adminUser) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'المستخدم المسؤول غير معروف.' });
        return;
    }
    setIsProcessing(request.id);
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', request.userId);
            const requestDocRef = doc(firestore, 'wallet_transactions', request.id);

            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("لم يتم العثور على حساب العميل.");

            const currentBalance = userDoc.data().wallet_balance || 0;
            const newBalance = currentBalance + request.amount;

            transaction.update(userDocRef, { wallet_balance: newBalance });
            transaction.update(requestDocRef, {
                status: 'approved',
                processed_by: adminUser.uid,
                processed_at: new Date().toISOString(),
            });
        });
        toast({ title: 'تمت الموافقة بنجاح!', description: `تمت إضافة ${request.amount} ر.ي إلى رصيد ${request.user_name}.` });

    } catch (error: any) {
        console.error("Approval transaction failed:", error);
        toast({ variant: 'destructive', title: 'فشلت الموافقة', description: error.message });
    } finally {
        setIsProcessing(null);
    }
  };
  
  const handleReject = async () => {
      if (!firestore || !requestToReject || !adminUser) return;
      setIsProcessing(requestToReject.id);
      
      const requestDocRef = doc(firestore, 'wallet_transactions', requestToReject.id);
      try {
          await updateDoc(requestDocRef, {
              status: 'rejected',
              rejection_reason: rejectionReason || 'تم الرفض بواسطة الإدارة',
              processed_by: adminUser.uid,
              processed_at: new Date().toISOString(),
          });
          toast({ title: 'تم رفض الطلب بنجاح' });
          setRequestToReject(null);
          setRejectionReason('');
      } catch (error: any) {
        console.error("Rejection failed:", error);
        toast({ variant: 'destructive', title: 'فشل رفض الطلب', description: error.message });
      } finally {
          setIsProcessing(null);
      }
  }
  
  const loading = requestsLoading || banksLoading;
  const dbError = requestsError;

  if (dbError) {
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center p-8">خطأ: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">طلبات شحن المحفظة</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">مراجعة واعتماد طلبات شحن الرصيد المقدمة من خدمة العملاء.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden mt-4">
            <CardHeader className="p-6 border-b border-gray-50">
            <CardTitle className="text-sm font-black flex items-center gap-2"><WalletCards className="h-4 w-4 text-primary" /> طلبات قيد الانتظار</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">البنك</TableHead>
                    <TableHead className="text-center">رقم السند</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center w-[200px]">إجراءات</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                {loading ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                    : requests?.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className='h-48 text-center text-muted-foreground font-bold'>
                                <FileWarning className='mx-auto w-12 h-12 text-gray-300 mb-2'/>
                                لا توجد طلبات شحن قيد الانتظار حالياً.
                            </TableCell>
                        </TableRow>
                    )
                    : requests?.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/50">
                        <TableCell>
                            <div className='font-bold text-xs'>
                                <p className='text-gray-800'>{req.user_name}</p>
                                <p className='text-gray-400 font-mono' dir='ltr'>{req.user_phone}</p>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg text-primary">{req.amount.toLocaleString()}<span className='text-xs'> ر.ي</span></TableCell>
                        <TableCell className="text-center font-bold text-xs text-muted-foreground">{getBankName(req.bank_id)}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground flex items-center justify-center gap-2">
                            {req.receipt_number}
                            {req.receipt_image && (
                                <Button variant="ghost" size="icon" className='h-7 w-7' onClick={() => setReceiptToView(req.receipt_image!)}>
                                    <Eye className='w-4 h-4 text-blue-500' />
                                </Button>
                            )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-gray-500">
                           {format(new Date(req.timestamp), 'dd MMM yyyy, hh:mm a', { locale: ar })}
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                                <Button size='sm' className='h-8 font-bold bg-green-500 hover:bg-green-600 gap-1' onClick={() => handleApprove(req)} disabled={!!isProcessing}>
                                    {isProcessing === req.id ? <Loader2 className='w-4 h-4 animate-spin' /> : <Check className='w-4 h-4'/>}
                                    موافقة
                                </Button>
                                <Button size='sm' variant='destructive' className='h-8 font-bold gap-1' onClick={() => setRequestToReject(req)} disabled={!!isProcessing}>
                                    <X className='w-4 h-4' />
                                    رفض
                                </Button>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      
      <Dialog open={!!requestToReject} onOpenChange={(open) => !open && setRequestToReject(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <CircleX className="w-6 h-6 text-destructive" />
                    تأكيد رفض طلب الشحن
                </DialogTitle>
                <DialogDescription>
                    سيتم رفض طلب شحن الرصيد للعميل "{requestToReject?.user_name}". يمكنك إضافة سبب الرفض (اختياري).
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input 
                    placeholder="اكتب سبب الرفض هنا..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
            </div>
            <DialogFooter>
            <Button onClick={handleReject} variant='destructive' disabled={!!isProcessing}>
                {isProcessing === requestToReject?.id ? <Loader2 className='animate-spin w-4 h-4' /> : 'تأكيد الرفض'}
            </Button>
            <DialogClose asChild><Button variant="secondary">إلغاء</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiptToView} onOpenChange={(open) => !open && setReceiptToView(null)}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>معاينة سند الإيداع</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex justify-center">
                {receiptToView && <Image src={receiptToView} alt="Receipt" width={800} height={1000} className="rounded-lg max-h-[80vh] w-auto object-contain" />}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
