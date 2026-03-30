'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, runTransaction, getDoc, setDoc, orderBy, addDoc } from 'firebase/firestore';
import type { User, LoyaltyPointsConfig, LoyaltyTransaction, FinanceTransaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, Star, ListChecks, Settings, Wand2, Coins, PlusCircle, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const CONFIG_DOC_ID = "points_config";
const CONFIG_COLLECTION_ID = "settings";

const RowSkeleton = () => <TableRow><TableCell colSpan={5} className="p-0"><Skeleton className="w-full h-14"/></TableCell></TableRow>;

export default function PointsSystemPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  // Settings State
  const [config, setConfig] = useState<LoyaltyPointsConfig>({ points_per_yer: 1000, cash_per_1000_points: 1000, vip_multiplier: 1.5 });
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isConfigSubmitting, setIsConfigSubmitting] = useState(false);

  // Conversion State
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pointsToConvert, setPointsToConvert] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Manual Adjustment State
  const [isAdjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustPointsUser, setAdjustPointsUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Log State
  const loyaltyTxQuery = useMemo(() => firestore ? query(collection(firestore, 'loyalty_transactions'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: loyaltyTransactions, loading: loyaltyTxLoading, error: loyaltyTxError } = useCollection<LoyaltyTransaction>(loyaltyTxQuery, 'loyalty_transactions');


  // Fetch config on load
  useEffect(() => {
    if (!firestore) return;
    const fetchConfig = async () => {
      setIsConfigLoading(true);
      const configDocRef = doc(firestore, CONFIG_COLLECTION_ID, CONFIG_DOC_ID);
      try {
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as LoyaltyPointsConfig);
        } else {
            await setDoc(configDocRef, config);
        }
      } catch (error) {
        console.error("Error fetching points config", error);
        if ((error as any)?.code === 'permission-denied') {
            // Let the main error boundary handle this
        } else {
            toast({ variant: 'destructive', title: "خطأ في جلب الإعدادات" });
        }
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
    const configDocRef = doc(firestore, CONFIG_COLLECTION_ID, CONFIG_DOC_ID);
    try {
      await setDoc(configDocRef, config, { merge: true });
      toast({ title: 'تم حفظ الإعدادات بنجاح' });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'فشل حفظ الإعدادات' });
    } finally {
      setIsConfigSubmitting(false);
    }
  };
  
  const handleSearchUser = async (phone: string) => {
    if (!firestore || !phone) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
        const userQuery = query(collection(firestore, 'users'), where('phone', '==', phone), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            toast({ variant: 'destructive', title: 'عميل غير موجود' });
            return null;
        } else {
            const user = { uid: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data()} as User;
            toast({ title: 'تم العثور على العميل', description: user.full_name });
            return user;
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'خطأ في البحث' });
        return null;
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
            
            const creditAmount = (pointsNum / 1000) * config.cash_per_1000_points;

            transaction.update(userDocRef, {
                loyalty_points: currentPoints - pointsNum,
                wallet_balance: currentBalance + creditAmount
            });

            const loyaltyTxRef = doc(collection(firestore, 'loyalty_transactions'));
            const financeTxRef = doc(collection(firestore, 'financeTransactions'));

            const loyaltyTxData: Omit<LoyaltyTransaction, 'id' | 'timestamp'> = {
                transactionId: loyaltyTxRef.id,
                userId: foundUser.uid,
                type: 'redeem',
                points: -pointsNum,
                related_finance_tx_id: financeTxRef.id,
                description: `تحويل ${pointsNum} نقطة إلى ${creditAmount.toLocaleString()} ر.ي رصيد`
            };
            transaction.set(loyaltyTxRef, {...loyaltyTxData, timestamp: new Date().toISOString() });
            
            const financeTxData: Omit<FinanceTransaction, 'id'> = {
                 transactionId: financeTxRef.id,
                 userUid: foundUser.uid,
                 amount: creditAmount,
                 type: 'points_conversion',
                 status: 'completed',
                 description: `رصيد من تحويل ${pointsNum} نقطة`,
                 created_at: new Date().toISOString()
            };
            transaction.set(financeTxRef, financeTxData);
        });

        toast({ title: "تم تحويل النقاط بنجاح", description: `تمت إضافة ${conversionCredit.toLocaleString()} ر.ي إلى محفظة العميل.` });
        setFoundUser(null);
        setSearchPhone('');
        setPointsToConvert('');
    } catch(error: any) {
        toast({ variant: 'destructive', title: "فشل تحويل النقاط", description: error.message });
    } finally {
        setIsConverting(false);
    }
  }

  const openAdjustDialog = async () => {
      const user = await handleSearchUser(searchPhone);
      if (user) {
          setAdjustPointsUser(user);
          setAdjustDialogOpen(true);
      }
  }

  const handleAdjustPoints = async () => {
    if(!firestore || !adjustPointsUser || !adminUser || !adjustReason || adjustAmount === 0) {
        toast({ variant: 'destructive', title: "بيانات ناقصة" });
        return;
    }
    setIsAdjusting(true);
     try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', adjustPointsUser.uid);
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("لم يتم العثور على العميل.");

            const currentPoints = userDoc.data().loyalty_points || 0;
            transaction.update(userDocRef, { loyalty_points: currentPoints + adjustAmount });

            const loyaltyTxRef = doc(collection(firestore, 'loyalty_transactions'));
            const loyaltyTxData: Omit<LoyaltyTransaction, 'id' | 'timestamp'> = {
                transactionId: loyaltyTxRef.id,
                userId: adjustPointsUser.uid,
                type: 'manual_adjustment',
                points: adjustAmount,
                description: `تعديل يدوي من المدير: ${adjustReason}`
            };
            transaction.set(loyaltyTxRef, {...loyaltyTxData, timestamp: new Date().toISOString() });
        });
        toast({ title: "تم تعديل النقاط بنجاح", description: `تمت إضافة/خصم ${adjustAmount} نقطة من رصيد ${adjustPointsUser.full_name}.` });
        setAdjustDialogOpen(false);
        setAdjustPointsUser(null);
        setAdjustAmount(0);
        setAdjustReason('');
    } catch(error: any) {
        toast({ variant: 'destructive', title: "فشل تعديل النقاط", description: error.message });
    } finally {
        setIsAdjusting(false);
    }
  }

  const conversionCredit = useMemo(() => {
    const points = parseInt(pointsToConvert, 10);
    if (isNaN(points) || points <= 0 || !config.cash_per_1000_points) return 0;
    return (points / 1000) * config.cash_per_1000_points;
  }, [pointsToConvert, config]);

  const dbError = loyaltyTxError;
  if (dbError) {
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
        return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8" style={{padding: '20px'}}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="text-primary"/> إعدادات قوانين النقاط</CardTitle>
                <CardDescription>حدد قواعد اكتساب واستبدال النقاط في النظام.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleConfigSave} className='space-y-6'>
                    {isConfigLoading ? <Skeleton className="h-48 w-full" /> : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>كل كم ريال يمني يساوي 1 نقطة؟</Label>
                                <Input type="number" value={config.points_per_yer} onChange={e => setConfig(c => ({...c, points_per_yer: e.target.valueAsNumber || 0}))} />
                            </div>
                             <div className="space-y-2">
                                <Label>قيمة الـ 1000 نقطة (بالريال اليمني)</Label>
                                <Input type="number" value={config.cash_per_1000_points} onChange={e => setConfig(c => ({...c, cash_per_1000_points: e.target.valueAsNumber || 0}))} />
                            </div>
                             <div className="space-y-2">
                                <Label>مضاعف النقاط للمشترك VIP (مثال: 1.5)</Label>
                                <Input type="number" step="0.1" value={config.vip_multiplier} onChange={e => setConfig(c => ({...c, vip_multiplier: e.target.valueAsNumber || 0}))} />
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
                <CardDescription>واجهة يدوية لتحويل نقاط عميل إلى رصيد في المحفظة.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
                 <fieldset className='p-4 border rounded-xl space-y-4'>
                    <legend className="text-sm font-bold px-2">1. البحث عن العميل</legend>
                     <div className="flex items-stretch gap-2">
                        <Input type="tel" placeholder="ابحث برقم الهاتف..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className='max-w-xs' dir='ltr'/>
                        <Button type="button" onClick={async () => setFoundUser(await handleSearchUser(searchPhone))} disabled={isSearching || !searchPhone}>
                            {isSearching ? <Loader2 className="animate-spin w-4 h-4"/> : <Search className='w-4 h-4'/>}
                        </Button>
                     </div>
                     {foundUser && (
                        <div className="p-2 border rounded-lg bg-green-50 flex items-center justify-between animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <UserCheck className='w-5 h-5 text-green-600'/>
                                <div>
                                    <p className="font-bold text-sm text-green-800">{foundUser.full_name}</p>
                                    <div className='flex gap-4'>
                                        <p className="flex items-center gap-1 text-xs font-bold text-amber-600"><Star className="w-3 h-3 fill-amber-500"/> {(foundUser.loyalty_points || 0).toLocaleString()} نقطة</p>
                                        <p className="flex items-center gap-1 text-xs font-bold text-sky-600"><Coins className="w-3 h-3 fill-sky-500"/> {(foundUser.wallet_balance || 0).toLocaleString()} ر.ي</p>
                                    </div>
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
                            <span>ستتم إضافة {conversionCredit.toLocaleString()} ر.ي إلى محفظة العميل.</span>
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
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل حركات النقاط</CardTitle>
                <CardDescription>عرض جميع عمليات كسب واستبدال وتعديل النقاط.</CardDescription>
            </div>
            <Button onClick={openAdjustDialog} variant="outline" className="w-full sm:w-auto">
                <Gift className="ml-2 h-4 w-4"/>
                إضافة/خصم نقاط (مكافأة)
            </Button>
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
                    {loyaltyTxLoading ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                    : loyaltyTransactions?.map(tx => (
                        <TableRow key={tx.id}>
                            <TableCell className="font-bold text-xs">{tx.userId.slice(0,10)}...</TableCell>
                            <TableCell className="text-center">
                               <Badge variant={tx.type === 'redeem' ? 'destructive' : tx.type === 'earn' ? 'default' : 'secondary'}>
                                 {tx.type === 'redeem' ? 'استبدال' : tx.type === 'earn' ? 'كسب' : 'تعديل يدوي'}
                               </Badge>
                            </TableCell>
                            <TableCell className={`text-center font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.points.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center text-xs text-gray-500">{tx.description}</TableCell>
                            <TableCell className="text-center text-xs font-mono text-gray-500">{tx.timestamp ? format(new Date(tx.timestamp), 'dd/MM/yy hh:mm a', { locale: ar }) : '...'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        </CardContent>
      </Card>
      
       {/* Manual Adjustment Dialog */}
       <Dialog open={isAdjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>تعديل يدوي لنقاط العميل</DialogTitle>
                  <DialogDescription>
                      إضافة أو خصم نقاط من رصيد "{adjustPointsUser?.full_name}". يرجى إدخال رقم موجب للإضافة ورقم سالب للخصم.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label>عدد النقاط</Label>
                      <Input
                          type="number"
                          placeholder="مثال: 50 للإضافة، -50 للخصم"
                          value={adjustAmount === 0 ? '' : adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.valueAsNumber || 0)}
                      />
                  </div>
                   <div className="space-y-2">
                      <Label>السبب (إلزامي)</Label>
                      <Textarea
                          placeholder="مثال: مكافأة عميل مميز، تصحيح خطأ..."
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                      />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="secondary">إلغاء</Button></DialogClose>
                  <Button onClick={handleAdjustPoints} disabled={isAdjusting || !adjustReason || adjustAmount === 0}>
                      {isAdjusting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'تنفيذ التعديل'}
                  </Button>
              </DialogFooter>
          </DialogContent>
       </Dialog>

    </div>
  );
}
