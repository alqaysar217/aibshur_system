'use client';
import { useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection, useUser, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, where, getDocs, runTransaction, serverTimestamp, orderBy } from 'firebase/firestore';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Check, X, Loader2, WalletCards, Eye, Search, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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

  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [requestToReject, setRequestToReject] = useState<WalletTopupRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Data fetching
  const requestsQuery = useMemo(() => firestore ? query(collection(firestore, 'wallet_transactions'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<WalletTopupRequest>(requestsQuery, 'wallet_transactions');

  const banksQuery = useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]);
  const { data: banks, loading: banksLoading, error: banksError } = useCollection<AppBank>(banksQuery, 'app_banks');

  const getBankName = useCallback((bankId: string) => {
    return banks?.find(b => b.id === bankId)?.bank_name || 'بنك غير معروف';
  }, [banks]);
  
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    let filtered = requests;
    
    if(activeTab !== 'all') {
        filtered = filtered.filter(req => req.status === activeTab);
    }
    
    if (searchQuery) {
        filtered = filtered.filter(req => 
            req.user_phone.includes(searchQuery) || 
            req.receipt_number?.includes(searchQuery)
        );
    }
    return filtered;
  }, [requests, activeTab, searchQuery]);

  const handleApprove = async (request: WalletTopupRequest) => {
    if (!firestore || !adminUser) return;
    setProcessingId(request.id);

    try {
      await runTransaction(firestore, async (transaction) => {
        const userQuery = query(collection(firestore, 'users'), where('phone', '==', request.user_phone));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          throw new Error(`لم يتم العثور على مستخدم بالرقم ${request.user_phone}`);
        }
        
        const userDocRef = userSnapshot.docs[0].ref;
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
             throw new Error("المستخدم غير موجود.");
        }
        
        const currentBalance = userDoc.data().wallet_balance || 0;
        const newBalance = currentBalance + request.amount;

        transaction.update(userDocRef, { wallet_balance: newBalance });
        
        const requestDocRef = doc(firestore, 'wallet_transactions', request.id);
        transaction.update(requestDocRef, { 
            status: 'approved',
            processed_by: adminUser.uid,
            processed_at: new Date().toISOString()
        });
      });

      toast({ title: 'تمت الموافقة بنجاح', description: `تمت إضافة ${request.amount} ر.ي إلى محفظة العميل.` });
    } catch (error: any) {
      console.error("Approval transaction failed: ", error);
      toast({ variant: 'destructive', title: 'فشلت عملية القبول', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!firestore || !requestToReject || !adminUser) return;
    if (!rejectionReason) {
        toast({variant: 'destructive', title: 'السبب مطلوب'});
        return;
    }

    setProcessingId(requestToReject.id);
    const requestDocRef = doc(firestore, 'wallet_transactions', requestToReject.id);

    try {
        await updateDoc(requestDocRef, {
            status: 'rejected',
            rejection_reason: rejectionReason,
            processed_by: adminUser.uid,
            processed_at: new Date().toISOString()
        });
        toast({ title: 'تم رفض الطلب' });
        setRequestToReject(null);
        setRejectionReason('');
    } catch (error: any) {
        console.error("Rejection failed: ", error);
        toast({ variant: 'destructive', title: 'فشلت عملية الرفض' });
    } finally {
        setProcessingId(null);
    }
  };
  
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">طلبات شحن المحفظة</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">مراجعة وقبول أو رفض طلبات شحن الرصيد من العملاء.</p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <div className='flex justify-between items-center gap-4'>
            <TabsList className="grid grid-cols-4 w-fit">
                <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
                <TabsTrigger value="approved">المقبولة</TabsTrigger>
                <TabsTrigger value="rejected">المرفوضة</TabsTrigger>
                <TabsTrigger value="all">الكل</TabsTrigger>
            </TabsList>
            <div className='relative w-full max-w-sm'>
                <Search className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground'/>
                <Input placeholder='ابحث برقم الهاتف أو السند...' className='pr-10' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
        </div>
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden mt-4">
            <CardHeader className="p-6 border-b border-gray-50">
            <CardTitle className="text-sm font-black flex items-center gap-2"><WalletCards className="h-4 w-4 text-primary" /> قائمة الطلبات ({filteredRequests.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">البنك</TableHead>
                    <TableHead className="text-center">السند</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center w-[180px]">إجراءات</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                {loading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                    : filteredRequests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className='h-48 text-center text-muted-foreground font-bold'>
                                <FileWarning className='mx-auto w-12 h-12 text-gray-300 mb-2'/>
                                لا توجد طلبات تطابق بحثك.
                            </TableCell>
                        </TableRow>
                    )
                    : filteredRequests.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/50">
                        <TableCell>
                            <div className='font-bold text-xs'>
                                <p className='text-gray-800'>{req.user_name}</p>
                                <p className='text-gray-400 font-mono' dir='ltr'>{req.user_phone}</p>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg text-primary">{req.amount.toLocaleString()}<span className='text-xs'> ر.ي</span></TableCell>
                        <TableCell className="text-center font-bold text-xs text-gray-500">{getBankName(req.bank_id)}</TableCell>
                        <TableCell className="text-center">
                            <div className='flex flex-col items-center gap-1'>
                                <Button variant='ghost' size='icon' className='h-8 w-8 rounded-lg' onClick={() => setImageToView(req.receipt_image)}>
                                    <Eye className='w-4 h-4 text-primary'/>
                                </Button>
                                {req.receipt_number && <Badge variant='secondary'>{req.receipt_number}</Badge>}
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                            <Badge className={cn('font-black text-xs', 
                                req.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                                req.status === 'approved' && 'bg-green-100 text-green-800',
                                req.status === 'rejected' && 'bg-red-100 text-red-800',
                            )}>
                                {req.status === 'pending' ? 'قيد الانتظار' : req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-gray-500">
                           {format(new Date(req.timestamp), 'dd MMM yyyy, hh:mm a', { locale: ar })}
                        </TableCell>
                        <TableCell className="text-center">
                            {req.status === 'pending' ? (
                                <div className='flex justify-center gap-2'>
                                    <Button size='sm' className='h-8 font-black bg-green-500 hover:bg-green-600 gap-1' onClick={() => handleApprove(req)} disabled={processingId === req.id}>
                                        {processingId === req.id ? <Loader2 className='w-4 h-4 animate-spin'/> : <Check className='w-4 h-4'/>}
                                        قبول
                                    </Button>
                                    <Button size='sm' variant='destructive' className='h-8 font-black gap-1' onClick={() => setRequestToReject(req)} disabled={processingId === req.id}>
                                        <X className='w-4 h-4'/>
                                        رفض
                                    </Button>
                                </div>
                            ) : (
                                <p className='text-xs text-muted-foreground font-bold'>
                                   {req.status === 'rejected' && req.rejection_reason ? `السبب: ${req.rejection_reason}` : 'تمت المعالجة'}
                                </p>
                            )}
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      </Tabs>

      <Dialog open={!!imageToView} onOpenChange={(open) => !open && setImageToView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>معاينة سند التحويل</DialogTitle>
          </DialogHeader>
          {imageToView && <Image src={imageToView} alt="إيصال" width={800} height={1000} className="rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!requestToReject} onOpenChange={(open) => !open && setRequestToReject(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>تأكيد رفض الطلب</AlertDialogTitle>
            <AlertDialogDescription>الرجاء إدخال سبب رفض طلب الشحن هذا. سيظهر السبب للعميل.</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea 
                placeholder='مثال: المبلغ المحول لا يطابق، صورة الإيصال غير واضحة...'
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className='my-4'
            />
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToReject(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={!rejectionReason}>تأكيد الرفض</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
