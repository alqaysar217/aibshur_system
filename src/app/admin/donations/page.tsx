'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, HeartHandshake, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

// This is a placeholder type. You should define it in src/lib/types.ts
interface Donation {
    id?: string;
    userId?: string; // UID of the user who donated, if known
    userName?: string;
    userPhone?: string;
    donationType: 'siquia' | 'itiam';
    amount: number;
    receiptNumber?: string;
    receiptImage?: string;
    timestamp: any; // Firestore server timestamp
}


export default function DonationsPage() {
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
  const [donationType, setDonationType] = useState<'siquia' | 'itiam'>('siquia');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Log Table State
  const donationsQuery = useMemo(() => firestore ? query(collection(firestore, 'donations'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: donations, loading: donationsLoading, error: donationsError } = useCollection<Donation>(donationsQuery, 'donations');


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
            toast({ variant: 'destructive', title: 'متبرع غير مسجل', description: 'يمكنك إكمال العملية وسيتم تسجيلها كمتبرع مجهول.' });
        } else {
            const user = { uid: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data()} as User;
            setFoundUser(user);
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
      if (!firestore) return;

      const donationAmount = parseFloat(amount);
      if (isNaN(donationAmount) || donationAmount <= 0) {
        toast({ variant: 'destructive', title: 'مبلغ غير صالح' });
        return;
      }
      setIsSubmitting(true);
      
      try {
        const donationData: Omit<Donation, 'id'> = {
            userId: foundUser?.uid,
            userName: foundUser?.full_name,
            userPhone: searchPhone,
            donationType: donationType,
            amount: donationAmount,
            receiptNumber: receiptNumber,
            receiptImage: receiptImage,
            timestamp: serverTimestamp(),
        };

        await addDoc(collection(firestore, 'donations'), donationData);
        
        toast({ 
            title: 'تم تسجيل التبرع بنجاح', 
            description: `شكراً لك، تم تسجيل تبرع بقيمة ${donationAmount.toLocaleString()} ر.ي.`
        });
        
        // Reset form
        setFoundUser(null);
        setSearchPhone('');
        setAmount('');
        setReceiptNumber('');
        setReceiptImage('');

      } catch (error: any) {
        console.error("Donation submission failed:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
  }
  
  if (donationsError) return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {donationsError.message}</p>;
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
                <fieldset className='p-4 border rounded-xl space-y-4'>
                    <legend className="text-sm font-bold px-2">1. بيانات المتبرع (اختياري)</legend>
                    <div className="flex items-stretch gap-2">
                        <Input
                            type="tel"
                            placeholder="ابحث برقم هاتف المتبرع..."
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
                
                <fieldset className="p-4 border rounded-xl space-y-4">
                    <legend className="text-sm font-bold px-2">2. تفاصيل التبرع</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className='space-y-2'>
                          <Label htmlFor='amount'>المبلغ (بالريال اليمني)</Label>
                          <Input id="amount" type="number" value={amount} onChange={e=>setAmount(e.target.value)} required dir='ltr' />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='donationType'>نوع التبرع</Label>
                          <select
                              id="donationType"
                              required
                              value={donationType}
                              onChange={(e) => setDonationType(e.target.value as any)}
                              className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                              <option value="siquia">سقيا ماء</option>
                              <option value="itiam">إطعام مسكين</option>
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

                <Button type="submit" className='w-full h-12 text-lg font-black' disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'تسجيل التبرع'}
                </Button>
            </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل التبرعات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">المتبرع</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">نوع التبرع</TableHead>
                    <TableHead className="text-center">رقم السند</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                    {donationsLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
                    : donations?.map(d => (
                        <TableRow key={d.id}>
                            <TableCell className="font-bold text-xs">{d.userName || 'فاعل خير'}<br/><span className="font-mono text-gray-500" dir="ltr">{d.userPhone}</span></TableCell>
                            <TableCell className="text-center font-bold text-green-600">{d.amount.toLocaleString()} ر.ي</TableCell>
                            <TableCell className="text-center text-xs font-bold text-gray-500">{d.donationType === 'siquia' ? 'سقيا ماء' : 'إطعام مسكين'}</TableCell>
                            <TableCell className="text-center text-xs font-mono">{d.receiptNumber || '-'}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-gray-500">{d.timestamp ? format(d.timestamp.toDate(), 'dd/MM/yy hh:mm a', { locale: ar }) : '...'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        </CardContent>
      </Card>
    </div>
  );
}
