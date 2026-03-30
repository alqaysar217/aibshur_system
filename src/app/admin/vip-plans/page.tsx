'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, updateDoc, setDoc, runTransaction, deleteDoc } from 'firebase/firestore';
import type { User, VipPlan, FinanceTransaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, Crown, ListChecks, PlusCircle, Edit, Trash2, Settings, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays, add } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function VipPlansPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  // --- Page State ---
  const [isPlanDialogOpen, setPlanDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Plan Management
  const [currentPlan, setCurrentPlan] = useState<Partial<VipPlan> | null>(null);
  const [planToDelete, setPlanToDelete] = useState<VipPlan | null>(null);
  const [newFeatureText, setNewFeatureText] = useState('');
  const plansQuery = useMemo(() => firestore ? query(collection(firestore, 'vip_plans')) : null, [firestore]);
  const { data: vipPlans, loading: plansLoading, error: plansError } = useCollection<VipPlan>(plansQuery, 'vip_plans');

  // Subscription Activation
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Audit Table
  const vipUsersQuery = useMemo(() => firestore ? query(collection(firestore, 'users'), where('vip_details.isActive', '==', true)) : null, [firestore]);
  const { data: vipUsers, loading: vipUsersLoading, error: vipUsersError } = useCollection<User>(vipUsersQuery, 'users');
  

  // --- Plan Management Functions ---
  const handleOpenPlanDialog = (plan: Partial<VipPlan> | null = null) => {
    setCurrentPlan(plan ? { ...plan } : {
        name: '',
        description: '',
        price: 0,
        durationInDays: 30,
        benefits: { hasFreeDelivery: false, discountPercentage: 0, pointsMultiplier: 1 },
        features: [],
        isActive: true,
    });
    setNewFeatureText('');
    setPlanDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (plan: VipPlan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!firestore || !planToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(firestore, 'vip_plans', planToDelete.id!));
        toast({ title: 'تم حذف الباقة بنجاح' });
        setIsDeleteDialogOpen(false);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'خطأ في حذف الباقة' });
        console.error(err);
    } finally {
        setIsSubmitting(false);
        setPlanToDelete(null);
    }
  };

  const addFeature = () => {
    if (newFeatureText.trim() && currentPlan) {
        const updatedFeatures = [...(currentPlan.features || []), newFeatureText.trim()];
        setCurrentPlan(p => ({...p, features: updatedFeatures}));
        setNewFeatureText('');
    }
  }

  const removeFeature = (indexToRemove: number) => {
      if (currentPlan) {
          const updatedFeatures = currentPlan.features?.filter((_, index) => index !== indexToRemove);
          setCurrentPlan(p => ({...p, features: updatedFeatures}));
      }
  }
  
  const handlePlanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentPlan) return;
    setIsSubmitting(true);
    
    let docRef;

    try {
        const planData: Omit<VipPlan, 'id' | 'planId'> = {
            name: currentPlan.name!,
            description: currentPlan.description || '',
            price: currentPlan.price!,
            durationInDays: currentPlan.durationInDays!,
            benefits: currentPlan.benefits!,
            features: currentPlan.features || [],
            isActive: currentPlan.isActive!,
        };

        if (currentPlan.id) {
            docRef = doc(firestore, 'vip_plans', currentPlan.id);
            await updateDoc(docRef, planData);
            toast({ title: 'تم تحديث الباقة بنجاح' });
        } else {
            docRef = doc(collection(firestore, 'vip_plans'));
            await setDoc(docRef, { ...planData, planId: docRef.id });
            toast({ title: 'تم إنشاء باقة بنجاح' });
        }
        setPlanDialogOpen(false);
    } catch(err: any) {
        toast({ variant: "destructive", title: "خطأ في حفظ الباقة" });
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  }


  // --- Subscription Activation Functions ---
  const handleSearchUser = async () => {
    if (!firestore || !searchPhone) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
        const userSnapshot = await getDocs(query(collection(firestore, 'users'), where('phone', '==', searchPhone), limit(1)));
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

  const handleActivateSubscription = async () => {
      if (!firestore || !foundUser || !selectedPlanId || !adminUser) {
        toast({ variant: 'destructive', title: "بيانات ناقصة" });
        return;
      }
      setIsSubmitting(true);
      
      try {
        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, 'users', foundUser.uid);
            const planDocRef = doc(firestore, 'vip_plans', selectedPlanId);
            const financialLogRef = doc(collection(firestore, 'financeTransactions'));

            const [userDoc, planDoc] = await Promise.all([
                transaction.get(userDocRef),
                transaction.get(planDocRef)
            ]);

            if (!userDoc.exists()) throw new Error("لم يتم العثور على العميل.");
            if (!planDoc.exists()) throw new Error("الباقة المحددة غير موجودة.");

            const plan = planDoc.data() as VipPlan;
            const startDate = new Date();
            const expiryDate = add(startDate, { days: plan.durationInDays });

            const vipDetails = {
                isActive: true,
                planId: plan.id,
                planName: plan.name,
                startDate: startDate.toISOString(),
                expiryDate: expiryDate.toISOString(),
            };

            transaction.update(userDocRef, { vip_details: vipDetails });
            
            const financialLog: Omit<FinanceTransaction, 'id'> = {
                transactionId: financialLogRef.id,
                userUid: foundUser.uid,
                amount: plan.price,
                type: 'vip_subscription',
                status: 'completed',
                description: `اشتراك في ${plan.name}`,
                created_at: new Date().toISOString()
            };
            transaction.set(financialLogRef, financialLog);

        });

        toast({ 
            title: 'تم تفعيل الاشتراك بنجاح', 
            description: `تم تفعيل باقة ${vipPlans?.find(p=>p.id === selectedPlanId)?.name} للعميل ${foundUser.full_name}.`
        });
        
        setFoundUser(null);
        setSearchPhone('');
        setReceiptNumber('');
        setSelectedPlanId('');

      } catch (error: any) {
        console.error("VIP activation failed:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
  }

  const handleCancelSubscription = async (userId: string) => {
    if(!firestore || !confirm("هل أنت متأكد من رغبتك في إلغاء هذا الاشتراك؟")) return;
    const userDocRef = doc(firestore, 'users', userId);
    try {
        await updateDoc(userDocRef, { 'vip_details.isActive': false });
        toast({ title: "تم إلغاء الاشتراك" });
    } catch(err) {
        toast({ variant: 'destructive', title: "فشل الإلغاء" });
    }
  }
  
  const dbError = vipUsersError || plansError;
  if (dbError) return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      {/* --- Plan Management Section --- */}
      <Card>
        <CardHeader className="flex-row justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><Settings className="text-primary"/> إدارة أنواع الباقات</CardTitle>
                <CardDescription>إنشاء وتعديل باقات VIP المتاحة للبيع.</CardDescription>
            </div>
            <Button onClick={() => handleOpenPlanDialog()}>
                <PlusCircle className="ml-2 h-4 w-4" /> إنشاء باقة جديدة
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                        <TableHead className="w-[150px]">اسم الباقة</TableHead>
                        <TableHead className="text-center">السعر</TableHead>
                        <TableHead className="text-center">المدة</TableHead>
                        <TableHead>المميزات</TableHead>
                        <TableHead className="text-center">الحالة</TableHead>
                        <TableHead className="text-center w-[120px]">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                    {plansLoading ? <TableRow><TableCell colSpan={6} className="p-0"><Skeleton className="h-14 w-full"/></TableCell></TableRow>
                    : vipPlans?.map(plan => (
                        <TableRow key={plan.id}>
                            <TableCell className="font-bold">{plan.name}</TableCell>
                            <TableCell className="text-center font-mono">{plan.price.toLocaleString()} ر.ي</TableCell>
                            <TableCell className="text-center">{plan.durationInDays} يوم</TableCell>
                            <TableCell>
                                <ul className="list-disc pr-4 space-y-1 text-xs">
                                    {plan.features?.map((feature, i) => <li key={i}>{feature}</li>)}
                                    {plan.benefits.hasFreeDelivery && <li className='font-bold text-green-600'>توصيل مجاني</li>}
                                </ul>
                            </TableCell>
                            <TableCell className="text-center"><Badge variant={plan.isActive ? "secondary" : "destructive"}>{plan.isActive ? 'مفعلة' : 'موقفة'}</Badge></TableCell>
                            <TableCell className="text-center">
                                <div className='flex justify-center items-center gap-1'>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenPlanDialog(plan)}><Edit className="h-4 w-4 text-gray-400"/></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-500" onClick={() => handleOpenDeleteDialog(plan)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="text-primary"/> تعميد وتفعيل الاشتراكات</CardTitle>
            <CardDescription>واجهة مخصصة لتفعيل أو تجديد عضويات VIP للعملاء.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
            <fieldset className='p-4 border rounded-xl space-y-4'>
                <legend className="text-sm font-bold px-2">1. البحث عن العميل</legend>
                <div className="flex items-stretch gap-2">
                    <Input type="tel" placeholder="ابحث برقم هاتف العميل..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className='max-w-xs' dir='ltr'/>
                    <Button type="button" onClick={handleSearchUser} disabled={isSearching || !searchPhone}>
                        {isSearching ? <Loader2 className="animate-spin w-4 h-4"/> : <Search className='w-4 h-4'/>}
                    </Button>
                    {foundUser && (
                    <div className="flex-1 p-2 border rounded-lg bg-green-50 flex items-center justify-between animate-in fade-in duration-300">
                        <div className="flex items-center gap-3"><UserCheck className='w-5 h-5 text-green-600'/>
                            <div><p className="font-bold text-sm text-green-800">{foundUser.full_name}</p><p className="text-xs text-green-600 font-mono" dir='ltr'>{foundUser.phone}</p></div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => {setFoundUser(null); setSearchPhone('')}}><X className="h-4 w-4"/></Button>
                    </div>
                    )}
                </div>
            </fieldset>
            
            <fieldset disabled={!foundUser || isSubmitting} className="p-4 border rounded-xl space-y-4 disabled:opacity-50 transition-opacity">
                <legend className="text-sm font-bold px-2">2. اختيار الباقة وتفاصيل الدفع</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className='space-y-2'>
                        <Label>اختر الباقة</Label>
                        <select required value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                            <option value="" disabled>اختر باقة...</option>
                            {vipPlans?.filter(p=>p.isActive).map(p => <option key={p.id} value={p.id!}>{p.name} ({p.price} ر.ي)</option>)}
                        </select>
                    </div>
                    <div className='space-y-2'>
                        <Label>رقم السند المرجعي</Label>
                        <Input value={receiptNumber} onChange={e=>setReceiptNumber(e.target.value)} required dir='ltr' />
                    </div>
                </div>
            </fieldset>

            <Button onClick={handleActivateSubscription} className='w-full h-12 text-lg font-black' disabled={!foundUser || isSubmitting || !selectedPlanId}>
                {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'تفعيل الاشتراك الآن'}
            </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل المشتركين الفعالين</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
                <TableHeader><TableRow><TableHead>العميل</TableHead><TableHead>الباقة</TableHead><TableHead>تاريخ الانتهاء</TableHead><TableHead>الأيام المتبقية</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader>
                <TableBody>
                    {vipUsersLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
                    : vipUsers?.map(user => (
                        <TableRow key={user.uid}>
                            <TableCell className="font-bold text-xs">{user.full_name}<br/><span className="font-mono text-gray-500" dir="ltr">{user.phone}</span></TableCell>
                            <TableCell><Badge className="font-bold bg-yellow-400 text-yellow-900 hover:bg-yellow-400/80"><Crown className="w-3 h-3 ml-1" />{user.vip_details?.planName}</Badge></TableCell>
                            <TableCell className="text-xs font-mono text-gray-500">{user.vip_details?.expiryDate ? format(new Date(user.vip_details.expiryDate), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell className="font-bold">{user.vip_details?.expiryDate ? `${Math.max(0, differenceInDays(new Date(user.vip_details.expiryDate), new Date()))} يوم` : '-'}</TableCell>
                            <TableCell><Button variant="destructive" size="sm" onClick={() => handleCancelSubscription(user.uid)}>إلغاء</Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        </CardContent>
      </Card>

      {/* --- Plan Creation/Edit Dialog --- */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
            <DialogHeader><DialogTitle>{currentPlan?.id ? 'تعديل باقة' : 'إنشاء باقة VIP جديدة'}</DialogTitle></DialogHeader>
            <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                    <div className="space-y-2"><Label>اسم الباقة (مثال: الباقة الذهبية)</Label><Input required value={currentPlan?.name || ''} onChange={e => setCurrentPlan(p => ({...p, name: e.target.value}))} /></div>
                    <div className="space-y-2"><Label>وصف مختصر للباقة (اختياري)</Label><Textarea value={currentPlan?.description || ''} onChange={e => setCurrentPlan(p => ({...p, description: e.target.value ?? ''}))} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-1">
                    <div className="space-y-2"><Label>السعر (ر.ي)</Label><Input type="number" required value={currentPlan?.price || 0} onChange={e => setCurrentPlan(p => ({...p, price: e.target.valueAsNumber}))} /></div>
                    <div className="space-y-2"><Label>المدة (بالأيام)</Label><Input type="number" required value={currentPlan?.durationInDays || 30} onChange={e => setCurrentPlan(p => ({...p, durationInDays: e.target.valueAsNumber}))} /></div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                    <Label className="font-bold">المميزات النصية</Label>
                    <div className="flex items-center gap-2">
                        <Input value={newFeatureText} onChange={(e) => setNewFeatureText(e.target.value)} placeholder="اكتب ميزة واضغط إضافة..."/>
                        <Button type="button" onClick={addFeature}><Plus className="h-4 w-4"/></Button>
                    </div>
                     <div className="space-y-2 pt-2">
                        {currentPlan?.features?.map((feature, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm">
                                <span>- {feature}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFeature(index)}><X className="h-4 w-4"/></Button>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                    <Label className="font-bold">المميزات البرمجية</Label>
                    <div className="p-3 rounded-lg bg-gray-50 space-y-3">
                        <div className="flex items-center space-x-2 space-x-reverse"><Checkbox id="freeDelivery" checked={currentPlan?.benefits?.hasFreeDelivery} onCheckedChange={c => setCurrentPlan(p=>({...p, benefits: {...p?.benefits!, hasFreeDelivery:!!c}}))} /><Label htmlFor="freeDelivery">توصيل مجاني</Label></div>
                        <div className="flex items-center gap-4"><Label>نسبة خصم (%)</Label><Input className="w-24" type="number" value={currentPlan?.benefits?.discountPercentage || 0} onChange={e => setCurrentPlan(p=>({...p, benefits: {...p?.benefits!, discountPercentage:e.target.valueAsNumber}}))} /></div>
                        <div className="flex items-center gap-4"><Label>مضاعف النقاط (x)</Label><Input className="w-24" type="number" value={currentPlan?.benefits?.pointsMultiplier || 1} onChange={e => setCurrentPlan(p=>({...p, benefits: {...p?.benefits!, pointsMultiplier:e.target.valueAsNumber}}))} /></div>
                    </div>
                </div>
                 <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50">
                    <Label className="font-bold text-gray-700">تفعيل الباقة للبيع</Label>
                    <Switch checked={currentPlan?.isActive} onCheckedChange={c => setCurrentPlan(p => ({...p, isActive: c}))} dir="ltr" />
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'حفظ'}</Button>
                    <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
                <AlertDialogDescription>سيتم حذف باقة "{planToDelete?.name}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">نعم، قم بالحذف</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
