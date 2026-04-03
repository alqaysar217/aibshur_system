'use client';
import { useState, useMemo, useCallback } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, where, getDocs, runTransaction, updateDoc, arrayUnion, orderBy } from 'firebase/firestore';
import type { User, Complaint, FinanceTransaction, AppConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, MessageSquare, Phone, Facebook, Mail, CheckCircle, Clock, Check, Users, Shield, Award, Send, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const KpiCard = ({ title, value, isLoading }: { title: string, value: string | number, isLoading: boolean }) => (
    <Card className='shadow-sm'>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-3xl font-black">{value}</div>}
        </CardContent>
    </Card>
);

const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
        case 'high': return <Badge variant="destructive">عاجل</Badge>;
        case 'medium': return <Badge className="bg-orange-400 text-white">متوسط</Badge>;
        case 'low': return <Badge variant="secondary">عادي</Badge>;
        default: return <Badge variant="outline">غير محدد</Badge>;
    }
}

export default function SupportPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();
  
  // Data Fetching
  const configDocRef = useMemo(() => firestore ? doc(firestore, 'settings', 'app_config') : null, [firestore]);
  const { data: config, loading: configLoading, error: configError } = useDoc<AppConfig>(configDocRef);
  const { data: complaints, loading: complaintsLoading, error: complaintsError } = useCollection<Complaint>(useMemo(() => firestore ? query(collection(firestore, 'complaints'), orderBy('createdAt', 'desc')) : null, [firestore]), { fetchOnce: false });
  const { data: admins, loading: adminsLoading } = useCollection<User>(useMemo(() => firestore ? query(collection(firestore, 'users'), where('roles.is_admin', '==', true)) : null, [firestore]));

  // State
  const [activeTab, setActiveTab] = useState('pending');
  const [isReplyOpen, setReplyOpen] = useState(false);
  const [isCompensateOpen, setCompensateOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [compensationAmount, setCompensationAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredComplaints = useMemo(() => {
    if (!complaints) return [];
    if (activeTab === 'all') return complaints;
    return complaints.filter(c => c.status === activeTab);
  }, [complaints, activeTab]);

  const stats = useMemo(() => {
    if (!complaints) return { open: 0, resolvedToday: 0, avgResolutionTime: 'N/A' };
    
    const open = complaints.filter(c => c.status === 'pending').length;
    const resolvedToday = complaints.filter(c => c.status === 'resolved' && c.history?.some(h => h.status === 'resolved' && isToday(parseISO(h.timestamp)))).length;
    
    // Average resolution time can be complex, so a placeholder for now
    const avgResolutionTime = "3 ساعات";

    return { open, resolvedToday, avgResolutionTime };
  }, [complaints]);

  const handleOpenReply = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setReplyMessage('');
    setReplyOpen(true);
  }

  const handleSendReply = async () => {
    if (!firestore || !adminUser || !selectedComplaint || !replyMessage) return;
    setIsSubmitting(true);
    const complaintDocRef = doc(firestore, 'complaints', selectedComplaint.id!);
    const historyEntry = {
        message: replyMessage,
        from: 'admin' as const,
        adminId: adminUser.uid,
        timestamp: new Date().toISOString()
    };
    try {
        await updateDoc(complaintDocRef, { history: arrayUnion(historyEntry) });
        setReplyMessage('');
        toast({ title: 'تم إرسال الرد' });
        // Optimistically update local state
        setSelectedComplaint(prev => prev ? {...prev, history: [...(prev.history || []), historyEntry]} : null);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إرسال الرد.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    if(!firestore || !adminUser) return;
    setIsSubmitting(true);
    const complaintDocRef = doc(firestore, 'complaints', complaintId);
    const historyEntry = {
        status: 'resolved' as const,
        timestamp: new Date().toISOString(),
        updatedBy: adminUser.uid,
    };
    try {
        await updateDoc(complaintDocRef, { status: 'resolved', history: arrayUnion(historyEntry) });
        toast({ title: 'تم حل الشكوى بنجاح' });
        setReplyOpen(false);
    } catch(err: any) {
        toast({variant: 'destructive', title: 'فشل تحديث الشكوى'});
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleCompensation = async () => {
      if(!firestore || !adminUser || !selectedComplaint || compensationAmount <= 0) {
          toast({variant: 'destructive', title: 'مبلغ غير صالح'});
          return;
      }
      setIsSubmitting(true);
      try {
        await runTransaction(firestore, async(transaction) => {
            const userDocRef = doc(firestore, 'users', selectedComplaint.userId);
            const userDoc = await transaction.get(userDocRef);
            if(!userDoc.exists()) throw new Error('لم يتم العثور على العميل');
            
            const currentBalance = userDoc.data().wallet_balance || 0;
            transaction.update(userDocRef, { wallet_balance: currentBalance + compensationAmount });

            const financeTxRef = doc(collection(firestore, 'financeTransactions'));
            const financeTx: Omit<FinanceTransaction, 'id'> = {
                transactionId: financeTxRef.id,
                userUid: selectedComplaint.userId,
                amount: compensationAmount,
                type: 'refund',
                status: 'completed',
                description: `تعويض عن الشكوى #${selectedComplaint.id?.slice(0,6)}`,
                created_at: new Date().toISOString()
            };
            transaction.set(financeTxRef, financeTx);

            const complaintDocRef = doc(firestore, 'complaints', selectedComplaint.id!);
            const historyEntry = {
                message: `تم تعويض العميل بمبلغ ${compensationAmount.toLocaleString()} ر.ي`,
                from: 'admin' as const,
                adminId: adminUser.uid,
                timestamp: new Date().toISOString()
            };
            transaction.update(complaintDocRef, { history: arrayUnion(historyEntry) });
        });
        toast({title: "تم التعويض بنجاح", description: `تمت إضافة ${compensationAmount.toLocaleString()} ر.ي لمحفظة العميل.`});
        setCompensateOpen(false);
        setCompensationAmount(0);
        setReplyOpen(false);
      } catch (err: any) {
          toast({variant: 'destructive', title: 'فشل عملية التعويض', description: err.message});
      } finally {
          setIsSubmitting(false);
      }
  }
  
  const dbError = configError || complaintsError;
  if (dbError) return <SetupFirestoreMessage />;
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
        <div>
            <h1 className="text-2xl font-black text-gray-900">مركز الدعم والمساندة</h1>
            <p className="text-gray-400 text-sm font-bold mt-1">إدارة شكاوى العملاء، معلومات التواصل، والإجراءات السريعة.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="تذاكر مفتوحة" value={stats.open} isLoading={complaintsLoading} />
            <KpiCard title="متوسط وقت الحل" value={stats.avgResolutionTime} isLoading={complaintsLoading} />
            <KpiCard title="حُلَّت اليوم" value={stats.resolvedToday} isLoading={complaintsLoading} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/> سجل الشكاوى والتذاكر</CardTitle>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
                             <TabsList>
                                <TabsTrigger value="all">الكل</TabsTrigger>
                                <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
                                <TabsTrigger value="resolved">تم الحل</TabsTrigger>
                             </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow><TableHead>العميل</TableHead><TableHead>الشكوى</TableHead><TableHead>الأولوية</TableHead><TableHead>التاريخ</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {complaintsLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full"/></TableCell></TableRow>)
                                : filteredComplaints.length > 0 ? (
                                    filteredComplaints.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-bold text-xs">{c.userName}<br/><span className="font-mono text-gray-400">{c.userPhone}</span></TableCell>
                                            <TableCell className="text-xs text-gray-600 max-w-xs truncate">{c.issueText}</TableCell>
                                            <TableCell>{getPriorityBadge(c.priority || 'low')}</TableCell>
                                            <TableCell className="font-mono text-xs text-gray-500">{format(new Date(c.createdAt), 'dd/MM/yy', { locale: ar })}</TableCell>
                                            <TableCell><Badge variant={c.status === 'resolved' ? 'secondary' : 'destructive'}>{c.status === 'resolved' ? 'مغلقة' : 'مفتوحة'}</Badge></TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={() => handleOpenReply(c)}>رد سريع</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">لا توجد شكاوى في هذا القسم.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">قنوات التواصل</CardTitle>
                        <CardDescription>روابط مباشرة للتواصل مع فريق الدعم.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         {configLoading ? <Skeleton className="h-24 w-full" /> : (
                            <>
                                <Button asChild className="w-full justify-start gap-4 bg-green-500 hover:bg-green-600"><a href={`https://wa.me/${config?.support.whatsapp_number.replace('+', '')}`} target="_blank" rel="noopener noreferrer"><Phone/> واتساب</a></Button>
                                <Button asChild className="w-full justify-start gap-4 bg-blue-600 hover:bg-blue-700"><a href={config?.support.facebook_url || '#'} target="_blank" rel="noopener noreferrer"><Facebook/> فيسبوك</a></Button>
                                <Button asChild className="w-full justify-start gap-4 bg-gray-700 hover:bg-gray-800"><a href={`mailto:${config?.support.email || ''}`}><Mail/> البريد الإلكتروني</a></Button>
                            </>
                         )}
                    </CardContent>
                </Card>
            </div>
        </div>
        
        <Dialog open={isReplyOpen} onOpenChange={setReplyOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>الرد على شكوى: {selectedComplaint?.userName}</DialogTitle>
                    <DialogDescription>
                        قضية: "{selectedComplaint?.issueText.substring(0, 50)}..."
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        <h4 className="font-bold">سجل المحادثة</h4>
                        <div className="space-y-3 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
                           {(selectedComplaint?.history || []).filter(h => h.message).map((h, i) => (
                               <div key={i} className={cn("p-2 rounded-lg text-sm", h.from === 'admin' ? 'bg-primary/10 text-right' : 'bg-secondary text-left')}>
                                   <p>{h.message}</p>
                                   <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(parseISO(h.timestamp), { addSuffix: true, locale: ar })}</p>
                               </div>
                           ))}
                           {(!selectedComplaint?.history || selectedComplaint.history.filter(h => h.message).length === 0) && (
                                <p className="text-center text-sm text-muted-foreground p-4">لا توجد رسائل سابقة.</p>
                           )}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reply-message">رسالتك للعميل</Label>
                        <Textarea id="reply-message" value={replyMessage} onChange={e => setReplyMessage(e.target.value)} placeholder="اكتب ردك هنا..."/>
                    </div>
                    <Button onClick={handleSendReply} disabled={isSubmitting || !replyMessage} className="w-full">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="ml-2 h-4 w-4" />} إرسال الرد
                    </Button>
                    <div className="flex justify-between items-center pt-4 border-t">
                        <Button variant="outline" onClick={() => setCompensateOpen(true)}>
                            <Coins className="ml-2 h-4 w-4"/> تعويض العميل
                        </Button>
                        <Button variant="destructive" onClick={() => handleResolveComplaint(selectedComplaint!.id!)} disabled={isSubmitting}>
                            <CheckCircle className="ml-2 h-4 w-4"/> إغلاق الشكوى
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isCompensateOpen} onOpenChange={setCompensateOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تعويض العميل</DialogTitle>
                    <DialogDescription>أدخل المبلغ لإضافته مباشرة إلى محفظة {selectedComplaint?.userName}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    <Label>المبلغ (ر.ي)</Label>
                    <Input type="number" value={compensationAmount || ''} onChange={e => setCompensationAmount(e.target.valueAsNumber)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">إلغاء</Button></DialogClose>
                    <Button onClick={handleCompensation} disabled={isSubmitting || compensationAmount <= 0}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "تأكيد التعويض"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
