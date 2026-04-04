'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, updateDoc, setDoc, runTransaction, deleteDoc } from 'firebase/firestore';
import type { User, VipPlan, FinanceTransaction, AppBank, VipPlanBenefits } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, UserCheck, UserX, Crown, ListChecks, PlusCircle, Edit, Trash2, Settings, Plus, ExternalLink, TicketPercent, Truck, Star, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays, add } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const PlanCardSkeleton = () => <Skeleton className="h-64 w-full rounded-lg" />;
const TableRowSkeleton = () => <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full"/></TableCell></TableRow>;
const ActivationSkeleton = () => <Skeleton className="h-[450px] w-full rounded-lg" />;

const PlanBenefit = ({ icon: Icon, text, value }: {icon: React.ElementType, text: string, value: React.ReactNode}) => (
    <div className="flex items-center text-sm">
        <Icon className="w-4 h-4 ml-2 text-primary" />
        <span className="font-bold">{text}:</span>
        <span className="mr-2 text-muted-foreground">{value}</span>
    </div>
);

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
  const { data: vipPlans, loading: plansLoading, error: plansError } = useCollection<VipPlan>(plansQuery, { fetchOnce: false, collectionPath: 'vip_plans' });

  // Subscription Activation
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [activationBankId, setActivationBankId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');

  // Data for dropdowns
  const { data: banks, loading: banksLoading, error: banksError } = useCollection<AppBank>(useMemo(() => firestore ? collection(firestore, 'app_banks') : null, [firestore]), { collectionPath: 'app_banks' });

  // Audit Table
  const vipUsersQuery = useMemo(() => firestore ? query(collection(firestore, 'users'), where('vip_details.isActive', '==', true)) : null, [firestore]);
  const { data: vipUsers, loading: vipUsersLoading, error: vipUsersError } = useCollection<User>(vipUsersQuery, { fetchOnce: false, collectionPath: 'users' });
  
  useEffect(() => {
    if (selectedPlanId && vipPlans) {
        const plan = vipPlans.find(p => p.id === selectedPlanId);
        if (plan) {
            setAmountPaid(String(plan.price));
        }
    }
  }, [selectedPlanId, vipPlans]);

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
    const docRef = doc(firestore, 'vip_plans', planToDelete.id!);
    try {
        await deleteDoc(docRef);
        toast({ title: 'تم حذف الباقة بنجاح' });
        setIsDeleteDialogOpen(false);
    } catch (err: any) {
        if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        } else {
            toast({ variant: 'destructive', title: 'خطأ في حذف الباقة' });
        }
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
    
    const planData: Omit<VipPlan, 'id' | 'planId'> = {
        name: currentPlan.name!,
        description: currentPlan.description || '',
        price: currentPlan.price!,
        durationInDays: currentPlan.durationInDays!,
        benefits: currentPlan.benefits!,
        features: currentPlan.features || [],
        isActive: currentPlan.isActive!,
    };
    
    let docRef;

    try {
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
        if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef!.path,
                operation: currentPlan.id ? 'update' : 'create',
                requestResourceData: planData
            }));
        } else {
            toast({ variant: "destructive", title: "خطأ في حفظ الباقة", description: err.message });
        }
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
    } catch (error: any) {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'users', operation: 'list'}));
        } else {
            toast({ variant: 'destructive', title: 'خطأ في البحث' });
        }
    } finally {
        setIsSearching(false);
    }
  }

  const handleActivateSubscription = async () => {
      if (!firestore || !foundUser || !selectedPlanId || !amountPaid || !activationBankId || !receiptNumber || !receiptImage || !adminUser) {
        toast({ variant: 'destructive', title: "بيانات ناقصة", description: "الرجاء تعبئة جميع حقول التفعيل الإلزامية." });
        return;
      }
      setIsSubmitting(true);
      
      try {
        const paidAmount = parseFloat(amountPaid);
        if (isNaN(paidAmount) || paidAmount <= 0) {
            throw new Error("المبلغ المدفوع غير صالح.");
        }

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
                planId: planDoc.id,
                planName: plan.name,
                startDate: startDate.toISOString(),
                expiryDate: expiryDate.toISOString(),
                amountPaid: paidAmount,
                receiptNumber: receiptNumber,
                receiptImageUrl: receiptImage,
                activatedBy: adminUser.uid,
            };

            transaction.update(userDocRef, { vip_details: vipDetails });
            
            const financialLog: Omit<FinanceTransaction, 'id'> = {
                transactionId: financialLogRef.id,
                userUid: foundUser.uid,
                orderId: planDoc.id, // Reference to the plan
                amount: paidAmount,
                type: 'vip_subscription',
                status: 'completed',
                description: `اشتراك في ${plan.name} (سند: ${receiptNumber})`,
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
        setSelectedPlanId('');
        setAmountPaid('');
        setActivationBankId('');
        setReceiptNumber('');
        setReceiptImage('');
        
      } catch (error: any) {
        console.error("VIP activation failed:", error);
        if (error.code === 'permission-denied') {
            toast({ variant: 'destructive', title: 'خطأ صلاحيات', description: 'لا يمكنك تنفيذ هذه العملية. تحقق من صلاحيات Firestore.' });
        } else {
            toast({ variant: 'destructive', title: 'فشلت العملية', description: error.message });
        }
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
        if ((err as any).code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update'}));
        } else {
            toast({ variant: 'destructive', title: "فشل الإلغاء" });
        }
    }
  }
  
  const dbError = vipUsersError || plansError || banksError;
  if (dbError) {
    if ((dbError as any).message.includes('permission-denied') || (dbError as any).message.includes('database (default) does not exist')) {
        return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-2xl font-black text-gray-900">إدارة العضويات المميزة (VIP)</h1>
            <p className="text-gray-400 text-sm font-bold mt-1">إنشاء الباقات، تفعيل الاشتراكات، ومتابعة العملاء المميزين.</p>
        </div>
        
        <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle className="flex items-center gap-2"><Settings className="text-primary"/> إدارة أنواع الباقات</CardTitle>
                    <CardDescription>إنشاء وتعديل باقات VIP المتاحة للبيع.</CardDescription>
                </div>
                <Button onClick={() => handleOpenPlanDialog()} className="rounded-lg">
                    <PlusCircle className="ml-2 h-4 w-4" /> إنشاء باقة
                </Button>
            </CardHeader>
            <CardContent>
                {plansLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <PlanCardSkeleton /><PlanCardSkeleton /><PlanCardSkeleton />
                </div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vipPlans?.map(plan => (
                        <Card key={plan.id} className="flex flex-col rounded-lg overflow-hidden shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
                            <CardHeader className={cn("p-4", plan.isActive ? 'bg-primary/10' : 'bg-muted/50')}>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="font-black text-lg text-primary">{plan.name}</CardTitle>
                                    <Badge variant={plan.isActive ? "default" : "secondary"} className={cn(plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600')}>{plan.isActive ? "مفعلة" : "موقوفة"}</Badge>
                                </div>
                                <div className="text-3xl font-black text-foreground pt-2">
                                    {plan.price.toLocaleString()} ر.ي <span className="text-sm font-normal text-muted-foreground">/ {plan.durationInDays} يوم</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 flex-grow">
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                                <div className="space-y-2">
                                    {plan.features?.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                    {plan.benefits.hasFreeDelivery && <PlanBenefit icon={Truck} text="توصيل مجاني" value="نعم"/>}
                                    {plan.benefits.discountPercentage > 0 && <PlanBenefit icon={TicketPercent} text="خصم إضافي" value={`${plan.benefits.discountPercentage}%`} />}
                                    {plan.benefits.pointsMultiplier > 1 && <PlanBenefit icon={Star} text="نقاط مضاعفة" value={`x${plan.benefits.pointsMultiplier}`}/>}
                                </div>
                            </CardContent>
                             <CardContent className="p-4 border-t flex justify-end gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenPlanDialog(plan)}><Edit className="w-4 h-4 text-gray-400"/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500" onClick={() => handleOpenDeleteDialog(plan)}><Trash2 className="w-4 h-4"/></Button>
                            </CardContent>
                        </Card>
                    ))}
                    {vipPlans?.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">لا توجد باقات VIP معرفة بعد. قم بإنشاء باقة جديدة.</p>}
                </div>
                )}
            </CardContent>
        </Card>
        
        <Card className="rounded-lg shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Crown className="text-primary"/> تعميد وتفعيل الاشتراكات</CardTitle>
                <CardDescription>واجهة مخصصة لتفعيل أو تجديد عضويات VIP للعملاء.</CardDescription>
            </CardHeader>
            <CardContent>
                {banksLoading ? <ActivationSkeleton /> : (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    <div className='space-y-6'>
                        <fieldset className='p-4 border rounded-lg space-y-4'>
                            <legend className="text-sm font-bold px-2">1. البحث عن العميل</legend>
                            <div className="flex items-stretch gap-2">
                                <Input type="tel" placeholder="ابحث برقم هاتف العميل..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} dir='ltr'/>
                                <Button type="button" onClick={handleSearchUser} disabled={isSearching || !searchPhone}>
                                    {isSearching ? <Loader2 className="animate-spin w-4 h-4"/> : <Search className='w-4 h-4'/>}
                                </Button>
                            </div>
                            {foundUser && (
                            <div className="p-3 border rounded-lg bg-green-50 flex items-center justify-between animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    <UserCheck className='w-5 h-5 text-green-600'/>
                                    <div><p className="font-bold text-sm text-green-800">{foundUser.full_name}</p><p className="text-xs text-green-600 font-mono" dir='ltr'>{foundUser.phone}</p></div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => {setFoundUser(null); setSearchPhone('')}}><X className="w-4 h-4"/></Button>
                            </div>
                            )}
                        </fieldset>
                        <Button onClick={handleActivateSubscription} className='w-full h-12 text-lg font-black' disabled={!foundUser || isSubmitting || !selectedPlanId || !receiptImage}>
                            {isSubmitting ? <Loader2 className='animate-spin w-6 h-6'/> : 'تفعيل الاشتراك الآن'}
                        </Button>
                    </div>

                    <fieldset disabled={!foundUser || isSubmitting} className="p-4 border rounded-lg space-y-4 disabled:opacity-50 transition-opacity">
                        <legend className="text-sm font-bold px-2">2. تفاصيل الدفع والاشتراك</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className='space-y-2'>
                                <Label>اختر الباقة*</Label>
                                <select required value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                                    <option value="" disabled>اختر باقة...</option>
                                    {vipPlans?.filter(p=>p.isActive).map(p => <option key={p.id} value={p.id!}>{p.name} ({p.price} ر.ي)</option>)}
                                </select>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='amountPaid'>المبلغ المدفوع*</Label>
                                <Input id="amountPaid" type="number" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} required dir='ltr' />
                            </div>
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='activationBankId'>البنك الوسيط*</Label>
                          <select id="activationBankId" required value={activationBankId} onChange={(e) => setActivationBankId(e.target.value)} disabled={banksLoading} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                              <option value="" disabled>اختر حساب البنك...</option>
                              {banks?.map(bank => <option key={bank.id} value={bank.id!}>{bank.bank_name}</option>)}
                          </select>
                        </div>
                        <div className='space-y-2'>
                            <Label>رقم السند/الحوالة*</Label>
                            <Input value={receiptNumber} onChange={e=>setReceiptNumber(e.target.value)} required dir='ltr' />
                        </div>
                        <div className='space-y-2'>
                            <Label>رابط صورة السند*</Label>
                            <Input type="text" required value={receiptImage} onChange={e => setReceiptImage(e.target.value)} dir="ltr" placeholder="https://..." />
                             {receiptImage && (receiptImage.startsWith('http') || receiptImage.startsWith('/')) && (
                                <div className="flex justify-center p-2 mt-2 border rounded-xl bg-gray-50/50 shadow-inner">
                                    <Image src={receiptImage} alt="معاينة السند" width={200} height={200} className="rounded-lg object-contain max-h-48 shadow-md"/>
                                </div>
                            )}
                        </div>
                    </fieldset>
                </div>
                )}
            </CardContent>
      </Card>
      
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل المشتركين الفعالين</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
                <TableHeader><TableRow><TableHead>العميل</TableHead><TableHead className="text-center">الباقة</TableHead><TableHead className="text-center">تاريخ الانتهاء</TableHead><TableHead className="text-center">الأيام المتبقية</TableHead><TableHead className="text-center">السند</TableHead><TableHead className="text-center">إجراء</TableHead></TableRow></TableHeader>
                <TableBody>
                    {vipUsersLoading ? Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)
                    : vipUsers?.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">لا يوجد مشتركين فعالين حالياً.</TableCell></TableRow>
                    : vipUsers?.map(user => {
                        const daysRemaining = user.vip_details?.expiryDate ? Math.max(0, differenceInDays(new Date(user.vip_details.expiryDate), new Date())) : 0;
                        return (
                        <TableRow key={user.uid}>
                            <TableCell className="font-bold text-xs">{user.full_name}<br/><span className="font-mono text-gray-500" dir="ltr">{user.phone}</span></TableCell>
                            <TableCell className="text-center"><Badge className="font-bold bg-yellow-400 text-yellow-900 hover:bg-yellow-400/80"><Crown className="w-3 h-3 ml-1" />{user.vip_details?.planName}</Badge></TableCell>
                            <TableCell className="text-center text-xs font-mono text-gray-500">{user.vip_details?.expiryDate ? format(new Date(user.vip_details.expiryDate), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell className={cn("text-center font-bold", daysRemaining < 3 && 'text-destructive')}>
                                {daysRemaining} يوم
                            </TableCell>
                            <TableCell className="text-center">
                                 {user.vip_details?.receiptImageUrl ? (
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                        <Link href={user.vip_details.receiptImageUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                ) : '-'}
                            </TableCell>
                            <TableCell className="text-center"><Button variant="destructive" size="sm" onClick={() => handleCancelSubscription(user.uid)}>إلغاء</Button></TableCell>
                        </TableRow>
                    )})}
                </TableBody>
             </Table>
        </CardContent>
      </Card>

      {/* --- Plan Creation/Edit Dialog --- */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-lg">
            <DialogHeader><DialogTitle className="font-black">{currentPlan?.id ? 'تعديل باقة' : 'إنشاء باقة VIP جديدة'}</DialogTitle></DialogHeader>
            <form onSubmit={handlePlanSubmit}>
            <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto px-1">
                <div className="p-4 border rounded-lg">
                    <h3 className="mb-4 font-bold text-base">المعلومات الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>اسم الباقة</Label><Input required value={currentPlan?.name || ''} onChange={e => setCurrentPlan(p => ({...p, name: e.target.value}))} /></div>
                        <div className="space-y-2"><Label>وصف مختصر للباقة</Label><Textarea value={currentPlan?.description || ''} onChange={e => setCurrentPlan(p => ({...p, description: e.target.value ?? ''}))} /></div>
                        <div className="space-y-2"><Label>السعر (ر.ي)</Label><Input type="number" required value={currentPlan?.price || ''} onChange={e => setCurrentPlan(p => ({...p, price: e.target.valueAsNumber}))} /></div>
                        <div className="space-y-2"><Label>المدة (بالأيام)</Label><Input type="number" required value={currentPlan?.durationInDays || 30} onChange={e => setCurrentPlan(p => ({...p, durationInDays: e.target.valueAsNumber}))} /></div>
                    </div>
                </div>

                 <div className="p-4 border rounded-lg">
                    <h3 className="mb-4 font-bold text-base">المميزات البرمجية</h3>
                     <div className="space-y-4">
                        <div className="flex items-center space-x-2 space-x-reverse"><Checkbox id="freeDelivery" checked={currentPlan?.benefits?.hasFreeDelivery} onCheckedChange={c => setCurrentPlan(p=>({...p, benefits: {...p?.benefits!, hasFreeDelivery:!!c}}))} /><Label htmlFor="freeDelivery" className="font-semibold">توصيل مجاني</Label></div>
                        <div className="flex items-center gap-4"><Label className="w-28">نسبة خصم (%)</Label><Input className="w-24" type="number" value={currentPlan?.benefits?.discountPercentage || 0} onChange={e => setCurrentPlan(p=>({...p, benefits: {...p?.benefits!, discountPercentage:e.target.valueAsNumber}}))} /></div>
                        <div className="flex items-center gap-4"><Label className="w-28">مضاعف النقاط (x)</Label><Input className="w-24" type="number" step="0.1" value={currentPlan?.benefits?.pointsMultiplier || 1} onChange={e => setCurrentPlan(p=>({...p, benefits: {...p?.benefits!, pointsMultiplier:e.target.valueAsNumber}}))} /></div>
                    </div>
                 </div>
                 
                 <div className="p-4 border rounded-lg">
                     <h3 className="mb-4 font-bold text-base">المميزات النصية (للعرض)</h3>
                    <div className="flex items-center gap-2">
                        <Input value={newFeatureText} onChange={(e) => setNewFeatureText(e.target.value)} placeholder="اكتب ميزة واضغط إضافة..."/>
                        <Button type="button" onClick={addFeature}><Plus className="h-4 w-4"/></Button>
                    </div>
                     <div className="space-y-2 pt-3">
                        {currentPlan?.features?.map((feature, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                                <span>- {feature}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFeature(index)}><X className="w-4 h-4"/></Button>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                    <Label className="font-bold text-gray-700">تفعيل الباقة للبيع</Label>
                    <Switch dir="ltr" checked={currentPlan?.isActive} onCheckedChange={c => setCurrentPlan(p => ({...p, isActive: !!c}))} />
                </div>
            </div>
                <DialogFooter className="pt-4 border-t">
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'حفظ الباقة'}</Button>
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
                <AlertDialogCancel className="rounded-lg">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-lg">
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4"/> : 'نعم، قم بالحذف'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
