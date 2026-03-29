'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs, addDoc } from 'firebase/firestore';
import type { WalletTopupRequest, User, AppBank } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';

export default function SubmitWalletPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: csUser } = useUser();

  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const banksQuery = useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]);
  const { data: banks, loading: banksLoading, error: banksError } = useCollection<AppBank>(banksQuery, 'app_banks');

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

  const handleSubmitRequest = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore || !csUser || !foundUser || !amount || !selectedBankId) {
          toast({ variant: 'destructive', title: 'بيانات ناقصة', description: 'الرجاء البحث عن العميل وإدخال المبلغ والبنك.' });
          return;
      }
      setIsSubmitting(true);

      const submissionAmount = parseFloat(amount);
      if (isNaN(submissionAmount) || submissionAmount <= 0) {
          toast({ variant: 'destructive', title: 'مبلغ غير صالح', description: 'الرجاء إدخال مبلغ صحيح.' });
          setIsSubmitting(false);
          return;
      }
      
      const transactionId = `req_${Date.now()}`;
      
      try {
        const requestsCollection = collection(firestore, 'wallet_transactions');
        const newRequest: Omit<WalletTopupRequest, 'id'> = {
            transactionId: transactionId,
            userId: foundUser.uid,
            user_name: foundUser.full_name || 'N/A',
            user_phone: foundUser.phone,
            amount: submissionAmount,
            receipt_number: receiptNumber,
            receipt_image: receiptImage,
            bank_id: selectedBankId,
            status: 'pending',
            timestamp: new Date().toISOString(),
            type: 'client_request', // This is a request from a client (via CS)
            // processed_by will be set on approval
        };
        await addDoc(requestsCollection, newRequest);
        toast({ title: 'تم رفع الطلب بنجاح', description: 'سيقوم المدير بمراجعته واعتماده.' });
        // Reset form
        setFoundUser(null);
        setSearchPhone('');
        setAmount('');
        setReceiptNumber('');
        setReceiptImage('');
        setSelectedBankId('');

      } catch (error: any) {
        console.error("Submission failed:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
  }
  
  if (banksError) {
    if (banksError.message.includes('database (default) does not exist') || banksError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center p-8">خطأ: {banksError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
            <CardTitle>رفع طلب شحن محفظة</CardTitle>
            <CardDescription>هذه الواجهة مخصصة لموظفي خدمة العملاء لرفع طلبات الشحن لمراجعتها من قبل الإدارة.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmitRequest} className='space-y-6'>
                <fieldset className='p-4 border rounded-xl space-y-4'>
                    <Label className='font-bold'>1. البحث عن العميل</Label>
                    <div className="flex items-stretch gap-2">
                        <Input
                            id="search-phone"
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
                    <Label className='font-bold'>2. تفاصيل الإيداع</Label>
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
                        </div>
                     </div>
                </fieldset>

                <Button type="submit" className='w-full h-12 text-lg font-black' disabled={!foundUser || isSubmitting}>
                    {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'رفع الطلب للمراجعة'}
                </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
