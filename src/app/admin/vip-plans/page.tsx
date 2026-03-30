'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, Crown, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function VipPlansPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  // Form State
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'silver' | 'gold'>('silver');
  const [duration, setDuration] = useState<'month' | 'year'>('month');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data fetching for active VIP users
  const vipUsersQuery = useMemo(() => firestore ? query(collection(firestore, 'users'), where('vip_details.is_active', '==', true)) : null, [firestore]);
  const { data: vipUsers, loading: vipUsersLoading, error: vipUsersError } = useCollection<User>(vipUsersQuery, 'users');

  const handleSearchUser = async () => {
    if (!firestore || !searchPhone) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
        const userQuery = query(collection(firestore, 'users'), where('phone', '==', searchPhone), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            toast({ variant: 'destructive', title: 'عميل غير موجود' });
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore || !foundUser) return;
      setIsSubmitting(true);
      
      try {
        const userDocRef = doc(firestore, 'users', foundUser.uid);
        
        const startDate = new Date();
        const expiryDate = new Date(startDate);
        if (duration === 'month') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const vipDetails = {
            is_active: true,
            plan_type: selectedPlan,
            start_date: startDate.toISOString(),
            expiry_date: expiryDate.toISOString(),
        };

        await updateDoc(userDocRef, { vip_details: vipDetails });
        
        toast({ 
            title: 'تم تفعيل باقة VIP بنجاح', 
            description: `تم تفعيل الباقة ${selectedPlan === 'gold' ? 'الذهبية' : 'الفضية'} للعميل ${foundUser.full_name}.`
        });
        
        // Reset form
        setFoundUser(null);
        setSearchPhone('');
        setReceiptNumber('');

      } catch (error: any) {
        console.error("VIP activation failed:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
  }
  
  if (vipUsersError) return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {vipUsersError.message}</p>;
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="text-primary"/> محرك تفعيل باقات VIP</CardTitle>
            <CardDescription>واجهة مخصصة لتفعيل أو تجديد عضويات VIP للعملاء.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className='space-y-6'>
                <fieldset className='p-4 border rounded-xl space-y-4'>
                    <legend className="text-sm font-bold px-2">1. البحث عن العميل</legend>
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
                    <legend className="text-sm font-bold px-2">2. اختيار الباقة وتفاصيل الدفع</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className='space-y-2'>
                          <Label htmlFor='planType'>نوع الباقة</Label>
                          <select
                              id="planType"
                              required
                              value={selectedPlan}
                              onChange={(e) => setSelectedPlan(e.target.value as any)}
                              className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                              <option value="silver">فضية</option>
                              <option value="gold">ذهبية</option>
                          </select>
                        </div>
                         <div className='space-y-2'>
                          <Label htmlFor='duration'>مدة الاشتراك</Label>
                          <select
                              id="duration"
                              required
                              value={duration}
                              onChange={(e) => setDuration(e.target.value as any)}
                              className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                              <option value="month">شهر</option>
                              <option value="year">سنة</option>
                          </select>
                        </div>
                         <div className='space-y-2'>
                          <Label htmlFor='receipt_number'>رقم السند (اختياري)</Label>
                          <Input id="receipt_number" value={receiptNumber} onChange={e=>setReceiptNumber(e.target.value)} dir='ltr' />
                        </div>
                    </div>
                </fieldset>

                <Button type="submit" className='w-full h-12 text-lg font-black' disabled={!foundUser || isSubmitting}>
                    {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'تفعيل الاشتراك الآن'}
                </Button>
            </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل المشتركين الفعالين</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-center">الباقة</TableHead>
                    <TableHead className="text-center">تاريخ الانتهاء</TableHead>
                    <TableHead className="text-center">الأيام المتبقية</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                    {vipUsersLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
                    : vipUsers?.map(user => (
                        <TableRow key={user.uid}>
                            <TableCell className="font-bold text-xs">{user.full_name}<br/><span className="font-mono text-gray-500" dir="ltr">{user.phone}</span></TableCell>
                            <TableCell className="text-center">
                                <Badge className={cn("font-bold", user.vip_details?.plan_type === 'gold' ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-400/80' : 'bg-gray-300 text-gray-800 hover:bg-gray-300/80')}>
                                     <Crown className="w-3 h-3 ml-1" />
                                    {user.vip_details?.plan_type === 'gold' ? 'ذهبية' : 'فضية'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono text-gray-500">{user.vip_details?.expiry_date ? format(new Date(user.vip_details.expiry_date), 'dd/MM/yyyy', { locale: ar }) : '-'}</TableCell>
                            <TableCell className="text-center font-bold">
                                {user.vip_details?.expiry_date ? `${Math.max(0, differenceInDays(new Date(user.vip_details.expiry_date), new Date()))} يوم` : '-'}
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
