'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, runTransaction, serverTimestamp, getDoc, setDoc, orderBy, writeBatch, addDoc } from 'firebase/firestore';
import type { User, LoyaltyPointsConfig, AdminConfigSetting, LoyaltyTransaction, FinanceTransaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, Star, ListChecks, Settings, Wand2, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const CONFIG_DOC_ID = "loyalty_points_config";

export default function PointsSystemPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  // Settings State
  const [config, setConfig] = useState<LoyaltyPointsConfig>({ rials_per_point: 1000, points_per_rial_credit: 10 });
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isConfigSubmitting, setIsConfigSubmitting] = useState(false);

  // Conversion State
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pointsToConvert, setPointsToConvert] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Log State
  const loyaltyTxQuery = useMemo(() => firestore ? query(collection(firestore, 'loyalty_transactions'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: loyaltyTransactions, loading: loyaltyTxLoading, error: loyaltyTxError } = useCollection<LoyaltyTransaction>(loyaltyTxQuery, 'loyalty_transactions');


  // Fetch config on load
  useEffect(() => {
    if (!firestore) return;
    const fetchConfig = async () => {
      setIsConfigLoading(true);
      const configDocRef = doc(firestore, 'admin_config_settings', CONFIG_DOC_ID);
      try {
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data().config_data);
        }
      } catch (error) {
        console.error("Error fetching points config", error);
        toast({ variant: 'destructive', title: "خطأ في جلب الإعدادات" });
      } finally {
        setIsConfigLoading(false);
      }
    };
    fetchConfig();
  }, [firestore, toast]);

  const handleConfigSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsConfigSubmitting(true);
    try {
      const configDocRef = doc(firestore, 'admin_config_settings', CONFIG_DOC_ID);
      const newConfig: AdminConfigSetting = {
          settingId: CONFIG_DOC_ID,
          type: 'loyalty_points_config',
          config_data: config,
          is_active: true
      }
      await setDoc(configDocRef, newConfig, { merge: true });
      toast({ title: 'تم حفظ الإعدادات بنجاح' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'فشل حفظ الإعدادات' });
    } finally {
      setIsConfigSubmitting(false);
    }
  };
  
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

  const handleConversion = async () => {
    if (!firestore || !foundUser || !pointsToConvert || !adminUser) return;
    
    const pointsNum = parseInt(pointsToConvert, 10);
    const userPoints = foundUser.loyalty_points || 0;

    if (isNaN(pointsNum) || pointsNum <= 0) {
        toast({ variant: 'destructive', title: "عدد نقاط غير صالح" });
        return;
    }
    if (pointsNum > userPoints) {
        toast({ variant: 'destructive', title: "نقاط غير كافية", description: `العميل يملك ${userPoints} نقطة فقط.` });
        return;
    }

    setIsConverting(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', foundUser.uid);
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("لم يتم العثور على العميل.");

            const currentPoints = userDoc.data().loyalty_points || 0;
            const currentBalance = userDoc.data().wallet_balance || 0;

            if(pointsNum > currentPoints) throw new Error("النقاط غير كافية لإتمام العملية.");

            const creditAmount = pointsNum / config.points_per_rial_credit;

            transaction.update(userDocRef, {
                loyalty_points: currentPoints - pointsNum,
                wallet_balance: currentBalance + creditAmount
            });

            const loyaltyTxRef = doc(collection(firestore, 'loyalty_transactions'));
            const financeTxRef = doc(collection(firestore, 'financeTransactions'));

            const loyaltyTx: LoyaltyTransaction = {
                transactionId: loyaltyTxRef.id,
                userId: foundUser.uid,
                type: 'redeem',
                points: -pointsNum,
                related_finance_tx_id: financeTxRef.id,
                description: `تحويل ${pointsNum} نقطة إلى ${creditAmount} ر.ي رصيد`,
                timestamp: serverTimestamp()
            };
            transaction.set(loyaltyTxRef, loyaltyTx);
            
            const financeTx: FinanceTransaction = {
                 transactionId: financeTxRef.id,
                 userUid: foundUser.uid,
                 amount: creditAmount,
                 type: 'points_conversion',
                 status: 'completed',
                 description: `رصيد من تحويل ${pointsNum} نقطة`,
                 created_at: new Date().toISOString()
            };
            transaction.set(financeTxRef, financeTx);
        });

        toast({ title: "تم تحويل النقاط بنجاح", description: `تمت إضافة ${creditAmount} ر.ي إلى محفظة العميل.` });
        setFoundUser(null);
        setSearchPhone('');
        setPointsToConvert('');
    } catch(error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: "فشل تحويل النقاط", description: error.message });
    } finally {
        setIsConverting(false);
    }
  }

  const conversionCredit = useMemo(() => {
    const points = parseInt(pointsToConvert, 10);
    if (isNaN(points) || points <= 0) return 0;
    return points / config.points_per_rial_credit;
  }, [pointsToConvert, config]);

  if (loyaltyTxError) return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {loyaltyTxError.message}</p>;
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="text-primary"/> إعدادات نظام النقاط</CardTitle>
                <CardDescription>حدد قواعد اكتساب واستبدال النقاط في النظام.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleConfigSave} className='space-y-6'>
                    {isConfigLoading ? <Skeleton className="h-24 w-full" /> : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>كل كم ريال يمني يساوي 1 نقطة؟</Label>
                                <Input type="number" value={config.rials_per_point} onChange={e => setConfig(c => ({...c, rials_per_point: e.target.valueAsNumber}))} />
                            </div>
                             <div className="space-y-2">
                                <Label>كل كم نقطة تساوي 1 ريال يمني في المحفظة؟</Label>
                                <Input type="number" value={config.points_per_rial_credit} onChange={e => setConfig(c => ({...c, points_per_rial_credit: e.target.valueAsNumber}))} />
                            </div>
                        </div>
                    )}
                    <Button type="submit" className="w-full" disabled={isConfigLoading || isConfigSubmitting}>
                        {isConfigSubmitting ? <Loader2 className='animate-spin w-4 h-4'/> : "حفظ الإعدادات"}
                    </Button>
                </form>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 className="text-primary"/> تحويل النقاط إلى رصيد</CardTitle>
                <CardDescription>واجهة يدوية لتحويل نقاط عميل محدد إلى رصيد في المحفظة.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
                 <fieldset className='p-4 border rounded-xl space-y-4'>
                    <legend className="text-sm font-bold px-2">1. البحث عن العميل</legend>
                     <div className="flex items-stretch gap-2">
                        <Input type="tel" placeholder="ابحث برقم الهاتف..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className='max-w-xs' dir='ltr'/>
                        <Button type="button" onClick={handleSearchUser} disabled={isSearching || !searchPhone}>
                            {isSearching ? <Loader2 className="animate-spin w-4 h-4"/> : <Search className='w-4 h-4'/>}
                        </Button>
                     </div>
                     {foundUser && (
                        <div className="p-2 border rounded-lg bg-green-50 flex items-center justify-between animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <UserCheck className='w-5 h-5 text-green-600'/>
                                <div>
                                    <p className="font-bold text-sm text-green-800">{foundUser.full_name}</p>
                                    <p className="text-xs text-green-600 font-mono" dir='ltr'>{foundUser.phone}</p>
                                    <p className="flex items-center gap-1 text-xs font-bold text-amber-600"><Star className="w-3 h-3 fill-amber-500"/> {foundUser.loyalty_points || 0} نقطة</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => {setFoundUser(null); setSearchPhone('')}}>
                                <UserX className="w-4 h-4"/>
                            </Button>
                        </div>
                        )}
                </fieldset>
                 <fieldset disabled={!foundUser || isConverting} className="p-4 border rounded-xl space-y-4 disabled:opacity-50 transition-opacity">
                    <legend className="text-sm font-bold px-2">2. تحديد عدد النقاط للتحويل</legend>
                    <div className="space-y-2">
                        <Label>النقاط المراد تحويلها</Label>
                        <Input type="number" placeholder='أدخل عدد النقاط هنا...' value={pointsToConvert} onChange={e => setPointsToConvert(e.target.value)} />
                    </div>
                     {conversionCredit > 0 && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg text-primary font-bold">
                            <Coins className="w-5 h-5" />
                            <span>ستتم إضافة {conversionCredit.toFixed(2)} ر.ي إلى محفظة العميل.</span>
                        </div>
                     )}
                </fieldset>
                 <Button onClick={handleConversion} className='w-full h-12 text-lg font-black' disabled={!foundUser || isConverting || conversionCredit <= 0}>
                    {isConverting ? <Loader2 className='animate-spin w-6 h-6'/> : 'تنفيذ التحويل'}
                </Button>
            </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل عمليات النقاط</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
                <TableHeader>
                <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-center">العملية</TableHead>
                    <TableHead className="text-center">النقاط</TableHead>
                    <TableHead className="text-center">الوصف</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                    {loyaltyTxLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
                    : loyaltyTransactions?.map(tx => (
                        <TableRow key={tx.id}>
                            <TableCell className="font-bold text-xs">{tx.userId.slice(0,10)}...</TableCell>
                            <TableCell className="text-center">
                               <Badge variant={tx.type === 'redeem' ? 'destructive' : 'secondary'}>
                                 {tx.type === 'redeem' ? 'استبدال' : tx.type === 'earn' ? 'كسب' : 'تعديل'}
                               </Badge>
                            </TableCell>
                            <TableCell className={`text-center font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.points.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center text-xs text-gray-500">{tx.description}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-gray-500">{tx.timestamp ? format(tx.timestamp.toDate(), 'dd/MM/yy hh:mm a', { locale: ar }) : '...'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        </CardContent>
      </Card>
    </div>
  );
}
