'use client';
import { useState, useMemo, useCallback } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, runTransaction, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '@/firebase/config';
import type { User, Donation, FinanceTransaction, AppBank, DonationType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, HeartHandshake, ListChecks, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const storage = getStorage(firebaseApp);

const donationTypes: { value: DonationType, label: string }[] = [
    { value: 'siquia', label: 'سقيا ماء' },
    { value: 'itiam', label: 'إطعام مسكين' },
    { value: 'jariyah', label: 'صدقة جارية' },
    { value: 'general', label: 'تبرع عام' },
];

const getDonationTypeLabel = (value: DonationType) => {
    return donationTypes.find(d => d.value === value)?.label || 'غير معروف';
}

export default function DonationsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  // Form State
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [donationType, setDonationType] = useState<DonationType>('siquia');
  const [selectedBankId, setSelectedBankId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Log Table State
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<DonationType | 'all'>('all');

  const donationsQuery = useMemo(() => firestore ? query(collection(firestore, 'donations'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: donations, loading: donationsLoading, error: donationsError } = useCollection<Donation>(donationsQuery, 'donations');
  const { data: banks, loading: banksLoading, error: banksError } = useCollection<AppBank>(useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]));

  const filteredDonations = useMemo(() => {
    if (!donations) return [];
    return donations.filter(d => {
        const phoneMatch = !logSearch || d.userPhone?.includes(logSearch);
        const typeMatch = logTypeFilter === 'all' || d.donationType === logTypeFilter;
        return phoneMatch && typeMatch;
    });
  }, [donations, logSearch, logTypeFilter]);

  const getBankName = useCallback((bankId: string) => {
    return banks?.find(b => b.id === bankId)?.bank_name || '...';
  }, [banks]);

  const handleSearchUser = async () => {
    if (!firestore || !searchPhone) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
        const userQuery = query(collection(firestore, 'users'), where('phone', '==', searchPhone), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            toast({ variant: 'destructive', title: 'متبرع غير مسجل', description: 'يمكنك إكمال العملية وسيتم تسجيلها كمتبرع.' });
            setDonorName(''); // Clear name if user not found
        } else {
            const user = { uid: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data()} as User;
            setFoundUser(user);
            setDonorName(user.full_name || '');
            toast({ title: 'تم العثور على المتبرع', description: user.full_name });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'خطأ في البحث' });
    } finally {
        setIsSearching(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore || !adminUser || !amount || !selectedBankId || !receiptImage) {
        toast({ variant: 'destructive', title: "بيانات ناقصة", description: "الرجاء تعبئة جميع الحقول الإلزامية ورفع صورة السند." });
        return;
      }
      setIsSubmitting(true);
      
      try {
        const donationAmount = parseFloat(amount);
        if (isNaN(donationAmount) || donationAmount <= 0) {
            throw new Error("المبلغ المدفوع غير صالح.");
        }

        // 1. Upload receipt image
        const imagePath = `donations_receipts/${Date.now()}_${receiptImage.name}`;
        const imageRef = ref(storage, imagePath);
        await uploadBytes(imageRef, receiptImage);
        const receiptImageUrl = await getDownloadURL(imageRef);

        // 2. Run Firestore transaction
        await runTransaction(firestore, async (transaction) => {
            const donationDocRef = doc(collection(firestore, 'donations'));
            const financeDocRef = doc(collection(firestore, 'financeTransactions'));

            const donationData: Donation = {
                donationId: donationDocRef.id,
                userId: foundUser?.uid,
                userName: donorName || 'فاعل خير',
                userPhone: foundUser?.phone || searchPhone,
                donationType: donationType,
                amount: donationAmount,
                bankId: selectedBankId,
                receiptNumber: receiptNumber,
                receiptImage: receiptImageUrl,
                timestamp: new Date().toISOString(),
            };
            transaction.set(donationDocRef, donationData);

            const financeData: FinanceTransaction = {
                transactionId: financeDocRef.id,
                userUid: foundUser?.uid || 'anonymous_donor',
                orderId: donationDocRef.id,
                amount: donationAmount,
                type: 'donation',
                status: 'completed',
                description: `تبرع: ${getDonationTypeLabel(donationType)}`,
                created_at: new Date().toISOString(),
            };
            transaction.set(financeDocRef, financeData);
        });
        
        toast({ 
            title: 'تم تسجيل التبرع بنجاح', 
            description: `شكراً لك، تم تسجيل تبرع بقيمة ${donationAmount.toLocaleString()} ر.ي.`
        });
        
        // Reset form
        setFoundUser(null);
        setSearchPhone('');
        setDonorName('');
        setAmount('');
        setReceiptNumber('');
        setReceiptImage(null);
        setSelectedBankId('');
        (e.target as HTMLFormElement).reset(); // Reset file input

      } catch (error: any) {
        console.error("Donation submission failed:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
  }
  
  const dbError = donationsError || banksError;
  if (dbError) return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartHandshake className="text-primary"/> تسجيل عملية تبرع</CardTitle>
            <CardDescription>واجهة مخصصة لتوثيق وأرشفة التبرعات الواردة للنظام.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className='space-y-6'>
                <fieldset className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl'>
                    <legend className="text-sm font-bold px-2">1. بيانات المتبرع (اختياري)</legend>
                    <div className="flex items-stretch gap-2">
                        <Input
                            type="tel"
                            placeholder="ابحث برقم هاتف مسجل..."
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            dir='ltr'
                        />
                        <Button type="button" onClick={handleSearchUser} disabled={isSearching || !searchPhone}>
                            {isSearching ? <Loader2 className="animate-spin w-4 h-4"/> : <Search className='w-4 h-4'/>}
                        </Button>
                    </div>
                     <div className='space-y-2'>
                        <Label>اسم المتبرع (يتم ملؤه تلقائياً أو إدخاله يدوياً)</Label>
                        <Input value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="فاعل خير"/>
                    </div>
                </fieldset>
                
                <fieldset className="p-4 border rounded-xl space-y-4">
                    <legend className="text-sm font-bold px-2">2. تفاصيل التبرع</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className='space-y-2'>
                          <Label>نوع التبرع*</Label>
                          <select
                              required
                              value={donationType}
                              onChange={(e) => setDonationType(e.target.value as any)}
                              className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            {donationTypes.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                          </select>
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='amount'>المبلغ (بالريال اليمني)*</Label>
                          <Input id="amount" type="number" value={amount} onChange={e=>setAmount(e.target.value)} required dir='ltr' />
                        </div>
                         <div className='space-y-2'>
                            <Label>البنك الوسيط*</Label>
                            <select
                                required
                                value={selectedBankId}
                                onChange={e => setSelectedBankId(e.target.value)}
                                disabled={banksLoading}
                                className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="" disabled>اختر البنك...</option>
                                {banks?.map(bank => <option key={bank.id} value={bank.id!}>{bank.bank_name}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className='space-y-2'>
                          <Label htmlFor='receipt_number'>رقم السند البنكي (اختياري)</Label>
                          <Input id="receipt_number" value={receiptNumber} onChange={e=>setReceiptNumber(e.target.value)} dir='ltr' />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='receipt_image'>صورة السند*</Label>
                          <Input id='receipt_image' type='file' required onChange={e => setReceiptImage(e.target.files ? e.target.files[0] : null)} accept="image/*" />
                        </div>
                     </div>
                </fieldset>

                <Button type="submit" className='w-full h-12 text-lg font-black' disabled={isSubmitting || banksLoading}>
                    {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'تسجيل التبرع'}
                </Button>
            </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل التبرعات</CardTitle>
            <div className="grid grid-cols-2 gap-4 pt-2">
                <Input placeholder='ابحث برقم هاتف...' value={logSearch} onChange={e => setLogSearch(e.target.value)} />
                 <select
                    value={logTypeFilter}
                    onChange={(e) => setLogTypeFilter(e.target.value as any)}
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                    <option value="all">كل الأنواع</option>
                    {donationTypes.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                </select>
            </div>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">المتبرع</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">نوع التبرع</TableHead>
                    <TableHead className="text-center">البنك</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center">السند</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                    {donationsLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
                    : filteredDonations?.map(d => (
                        <TableRow key={d.id}>
                            <TableCell className="font-bold text-xs">{d.userName || 'فاعل خير'}<br/><span className="font-mono text-gray-500" dir="ltr">{d.userPhone}</span></TableCell>
                            <TableCell className="text-center font-bold text-green-600">{d.amount.toLocaleString()} ر.ي</TableCell>
                            <TableCell className="text-center text-xs font-bold text-gray-500">{getDonationTypeLabel(d.donationType)}</TableCell>
                            <TableCell className="text-center text-xs font-bold text-gray-500">{getBankName(d.bankId)}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-gray-500">{d.timestamp ? format(new Date(d.timestamp), 'dd/MM/yy hh:mm a', { locale: ar }) : '...'}</TableCell>
                            <TableCell className="text-center">
                                {d.receiptImage && 
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={d.receiptImage} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                }
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
