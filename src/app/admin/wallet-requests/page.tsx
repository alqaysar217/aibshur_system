'use client';
import { useState, useMemo, useCallback } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs, runTransaction, orderBy, limit } from 'firebase/firestore';
import type { WalletTopupRequest, User, AppBank } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, Wallet, ListChecks, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';

const LogRowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={7} className="p-0">
            <Skeleton className="w-full h-[60px]"/>
        </TableCell>
    </TableRow>
);


export default function DirectCreditPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  // Form State
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [amount, setAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Log Table State
  const [logSearch, setLogSearch] = useState('');

  // Data Fetching
  const banksQuery = useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]);
  const { data: banks, loading: banksLoading, error: banksError } = useCollection<AppBank>(banksQuery, 'app_banks');

  const requestsQuery = useMemo(() => firestore ? query(collection(firestore, 'wallet_transactions'), orderBy('timestamp', 'desc'), limit(50)) : null, [firestore]);
  const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<WalletTopupRequest>(requestsQuery, 'wallet_transactions');

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (!logSearch) return requests;
    return requests.filter(req => 
      req.user_phone.includes(logSearch) || 
      req.receipt_number?.includes(logSearch)
    );
  }, [requests, logSearch]);

  const getBankName = useCallback((bankId: string) => {
    if (banksLoading || !banks) return '...';
    return banks.find(b => b.id === bankId)?.bank_name || 'غير معروف';
  }, [banks, banksLoading]);


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
            toast({ variant: 'destructive', title: 'عميل غير موجود', description: 'لا يوجد مستخدم مسجل بهذا الرقم.' });
        } else {
            const user = { uid: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data()} as User;
            setFoundUser(user);
            toast({ title: 'تم العثور على العميل', description: user.full_name });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'خطأ في البحث' });
    } finally {
        setIsSearching(false);
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore || !adminUser || !foundUser || !amount || !selectedBankId) {
          toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'الرجاء التأكد من البحث عن العميل وإدخال المبلغ والبنك.' });
          return;
      }
      setIsSubmitting(true);

      const submissionAmount = parseFloat(amount);
      if (isNaN(submissionAmount) || submissionAmount <= 0) {
          toast({ variant: 'destructive', title: 'مبلغ غير صالح', description: 'الرجاء إدخال مبلغ صحيح.' });
          setIsSubmitting(false);
          return;
      }
      
      try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', foundUser.uid);
            const requestDocRef = doc(collection(firestore, 'wallet_transactions'));

            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("لم يتم العثور على حساب العميل.");

            const currentBalance = userDoc.data().wallet_balance || 0;
            const newBalance = currentBalance + submissionAmount;
            
            transaction.update(userDocRef, { wallet_balance: newBalance });

            const newRequest: Omit<WalletTopupRequest, 'id'> = {
                transactionId: requestDocRef.id,
                userId: foundUser.uid,
                user_name: foundUser.full_name || 'N/A',
                user_phone: foundUser.phone,
                amount: submissionAmount,
                receipt_number: receiptNumber,
                receipt_image: receiptImage,
                bank_id: selectedBankId,
                status: 'approved', // Directly approved by admin
                timestamp: new Date().toISOString(),
                type: 'manual_topup',
                processed_by: adminUser.uid,
                processed_at: new Date().toISOString(),
            };
            transaction.set(requestDocRef, newRequest);
        });

        toast({ 
            title: 'تم شحن الرصيد بنجاح', 
            description: `تمت إضافة ${submissionAmount.toLocaleString()} ر.ي إلى رصيد ${foundUser.full_name}.`
        });
        
        // Reset form
        setFoundUser(null);
        setSearchPhone('');
        setAmount('');
        setReceiptNumber('');
        setReceiptImage('');
        setSelectedBankId('');

      } catch (error: any) {
        console.error("Submission transaction failed:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
  }
  
  const dbError = banksError || requestsError;
  if (dbError) {
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="text-primary"/> محرك الإيداع المباشر</CardTitle>
            <CardDescription>واجهة مخصصة للمدراء لإضافة رصيد للعملاء بشكل فوري بناءً على الحوالات المستلمة.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmitRequest} className='space-y-6'>
                <fieldset className='p-4 border rounded-xl space-y-4'>
                    <legend className="text-sm font-bold px-2">الخطوة ١: البحث عن العميل</legend>
                    <div className="flex items-stretch gap-2">
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
                        {foundUser && (
                        <div className="flex-1 p-2 border rounded-lg bg-green-50 flex items-center justify-between animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <UserCheck className='w-5 h-5 text-green-600'/>
                                <div>
                                    <p className="font-bold text-sm text-green-800">{foundUser.full_name}</p>
                                    <p className="text-xs text-green-600 font-mono" dir='ltr'>{foundUser.phone}</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => {setFoundUser(null); setSearchPhone('')}}>
                                <UserX className="w-4 h-4"/>
                            </Button>
                        </div>
                        )}
                    </div>
                </fieldset>
                
                <fieldset disabled={!foundUser || isSubmitting} className="p-4 border rounded-xl space-y-4 disabled:opacity-50 transition-opacity">
                    <legend className="text-sm font-bold px-2">الخطوة ٢: تفاصيل الإيداع</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className='space-y-2'>
                          <Label htmlFor='amount'>المبلغ (بالريال اليمني)</Label>
                          <Input id="amount" type="number" value={amount} onChange={e=>setAmount(e.target.value)} required dir='ltr' />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='bank_id'>تم الإيداع في بنك</Label>
                          <select
                              id="bank_id"
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
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className='space-y-2'>
                          <Label htmlFor='receipt_number'>رقم السند البنكي (اختياري)</Label>
                          <Input id="receipt_number" value={receiptNumber} onChange={e=>setReceiptNumber(e.target.value)} dir='ltr' />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='receipt_image'>رابط صورة السند (اختياري)</Label>
                          <Input id='receipt_image' type='url' value={receiptImage} onChange={e=>setReceiptImage(e.target.value)} dir='ltr' placeholder='https://...' />
                           {receiptImage && (receiptImage.startsWith('http') || receiptImage.startsWith('/')) && (
                                <div className="flex justify-center p-2 mt-2 border rounded-xl bg-gray-50/50 shadow-inner">
                                    <Image src={receiptImage} alt="معاينة السند" width={200} height={200} className="rounded-lg object-contain max-h-48 shadow-md"/>
                                </div>
                            )}
                        </div>
                     </div>
                </fieldset>

                <Button type="submit" className='w-full h-12 text-lg font-black' disabled={!foundUser || isSubmitting || banksLoading}>
                    {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'اعتماد وشحن الرصيد فوراً'}
                </Button>
            </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل عمليات الشحن اليدوي</CardTitle>
            <div className="pt-2">
                <Input placeholder="ابحث برقم الهاتف أو رقم السند..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="max-w-sm" />
            </div>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">البنك</TableHead>
                    <TableHead className="text-center">رقم السند</TableHead>
                    <TableHead className="text-center">قام بالإدخال</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center">السند</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                    {requestsLoading ? Array.from({ length: 4 }).map((_, i) => <LogRowSkeleton key={i} />)
                    : filteredRequests.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-24">لا توجد سجلات لعرضها.</TableCell></TableRow>
                    )
                    : filteredRequests.map(req => (
                        <TableRow key={req.id}>
                            <TableCell className="font-bold text-xs">{req.user_name}<br/><span className="font-mono text-gray-500" dir="ltr">{req.user_phone}</span></TableCell>
                            <TableCell className="text-center font-bold text-green-600">{req.amount.toLocaleString()} ر.ي</TableCell>
                            <TableCell className="text-center text-xs font-bold text-gray-500">{getBankName(req.bank_id)}</TableCell>
                            <TableCell className="text-center text-xs font-mono">{req.receipt_number || '-'}</TableCell>
                            <TableCell className="text-center text-xs text-gray-500">{req.processed_by ? 'مدير' : 'غير معروف'}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-gray-500">{format(new Date(req.timestamp), 'dd/MM/yy hh:mm a', { locale: ar })}</TableCell>
                             <TableCell className="text-center">
                                {req.receipt_image ? (
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={req.receipt_image} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                ) : '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        </CardContent>
      </Card>
    </div>
  );
}
