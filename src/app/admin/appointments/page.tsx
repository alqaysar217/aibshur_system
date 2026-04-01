'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc, arrayUnion, getDocs, limit } from 'firebase/firestore';
import type { Appointment, User, Store, AppointmentStatus, AppointmentHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarIcon, CheckCircle, Clock, Loader2, User as UserIcon, ShoppingBag, MapPin, Tag, X, History, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isToday, isTomorrow, isThisMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CardSkeleton = () => (
    <Card className="rounded-md shadow p-3 space-y-2">
        <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/4" />
        </div>
        <Skeleton className="h-6 w-1/3" />
    </Card>
);

const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
        case 'scheduled': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs font-bold">مجدول</Badge>;
        case 'confirmed': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-bold">مؤكد</Badge>;
        case 'dispatched': return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 text-xs font-bold">مرسل</Badge>;
        case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs font-bold">مكتمل</Badge>;
        case 'cancelled': return <Badge variant="destructive" className="text-xs font-bold">ملغي</Badge>;
        default: return <Badge variant="secondary" className="text-xs font-bold">غير معروف</Badge>;
    }
}

const getStatusLabel = (status: AppointmentStatus) => {
    const labels: Record<AppointmentStatus, string> = { scheduled: 'مجدول', confirmed: 'مؤكد', dispatched: 'مرسل للمندوب', completed: 'مكتمل', cancelled: 'ملغي' };
    return labels[status] || 'غير معروف';
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const [timeFilter, setTimeFilter] = useState<'today' | 'tomorrow' | 'this_month' | 'completed'>('today');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [isRescheduleActive, setRescheduleActive] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [editedTime, setEditedTime] = useState('');
  
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: appointments, loading: appointmentsLoading, error: appointmentsError } = useCollection<Appointment>(useMemo(() => firestore ? query(collection(firestore, 'appointments'), orderBy('appointmentDate', 'asc')) : null, [firestore, refreshKey]), {fetchOnce: true});
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>(useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore, refreshKey]), {fetchOnce: true});
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore, refreshKey]), {fetchOnce: true});
  
  const dataLoading = appointmentsLoading || usersLoading || storesLoading;

  const userMap = useMemo(() => new Map(users?.map(u => [u.uid, u])), [users]);
  const storeMap = useMemo(() => new Map(stores?.map(s => [s.id, s])), [stores]);

  const { filteredAppointments, counts } = useMemo(() => {
    if (!appointments) return { filteredAppointments: [], counts: { today: 0, tomorrow: 0, this_month: 0, completed: 0 } };

    const today: Appointment[] = [], tomorrow: Appointment[] = [], this_month: Appointment[] = [];
    const completed = appointments.filter(app => app.status === 'completed');

    appointments.forEach(app => {
        if (app.status === 'completed' || app.status === 'cancelled') return;
        const appDate = parseISO(app.appointmentDate);
        if (isToday(appDate)) today.push(app);
        if (isTomorrow(appDate)) tomorrow.push(app);
        if (isThisMonth(appDate)) this_month.push(app);
    });

    const counts = { today: today.length, tomorrow: tomorrow.length, this_month: this_month.length, completed: completed.length };
    let filtered: Appointment[] = [];
    switch(timeFilter) {
        case 'today': filtered = today; break;
        case 'tomorrow': filtered = tomorrow; break;
        case 'this_month': filtered = this_month; break;
        case 'completed': filtered = completed; break;
    }
    
    return { filteredAppointments: filtered.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()), counts };
  }, [appointments, timeFilter]);
  
  const handleRefresh = () => { setRefreshKey(prev => prev + 1); toast({title: "جاري تحديث البيانات..."}); }

  const handleStatusUpdate = async (appointmentId: string, newStatus: AppointmentStatus, reason?: string) => {
      if (!firestore || !adminUser) return;
      setIsSubmitting(true);
      const appointmentDocRef = doc(firestore, 'appointments', appointmentId);
      
      const historyEntry: AppointmentHistoryItem = { status: newStatus, timestamp: new Date().toISOString(), updatedBy: adminUser.uid, ...(reason && { reason }) };

      try {
          await updateDoc(appointmentDocRef, { status: newStatus, history: arrayUnion(historyEntry) });
          toast({ title: "تم تحديث حالة الموعد" });
          handleRefresh();
      } catch(err: any) {
          toast({ variant: 'destructive', title: "خطأ", description: "فشل تحديث حالة الموعد" });
      } finally {
          setIsSubmitting(false);
          setCancelOpen(false);
          setDetailsOpen(false);
      }
  }

  const handleOpenDetails = (app: Appointment) => {
    setSelectedAppointment(app);
    const appointmentDate = parseISO(app.appointmentDate);
    setEditedDate(format(appointmentDate, 'yyyy-MM-dd'));
    setEditedTime(format(appointmentDate, 'HH:mm'));
    setCancelReason('');
    setRescheduleActive(false);
    setDetailsOpen(true);
  }

  const handleReschedule = async () => {
    if (!firestore || !selectedAppointment || !editedDate || !editedTime) return;
    setIsSubmitting(true);
    const appointmentDocRef = doc(firestore, 'appointments', selectedAppointment.id!);

    try {
        const newAppointmentDateTime = new Date(`${editedDate}T${editedTime}`);
        await updateDoc(appointmentDocRef, { appointmentDate: newAppointmentDateTime.toISOString() });
        toast({ title: "تم تعديل الموعد بنجاح" });
        setDetailsOpen(false);
        handleRefresh();
    } catch (err: any) {
        toast({ variant: 'destructive', title: "خطأ في التعديل", description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const dbError = appointmentsError || usersError || storesError;
  if (dbError) {
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) return <SetupFirestoreMessage />;
    return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  const statusTabs = [
    { label: 'مواعيد اليوم', value: 'today', count: counts.today },
    { label: 'مواعيد الغد', value: 'tomorrow', count: counts.tomorrow },
    { label: 'هذا الشهر', value: 'this_month', count: counts.this_month },
    { label: 'مكتملة', value: 'completed', count: counts.completed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-xl font-black text-gray-900">إدارة المواعيد والطلبات المجدولة</h1>
            <p className="text-gray-400 text-xs font-bold mt-1">تأكيد وتوزيع الطلبات المجدولة على المناديب.</p>
        </div>
        <Button onClick={handleRefresh} variant="ghost" size="icon" disabled={dataLoading}>
            <RefreshCw className={cn("h-5 w-5", dataLoading && "animate-spin")} />
        </Button>
      </div>

      <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)} dir="rtl">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            <TabsList className="bg-transparent p-0 gap-2 h-auto whitespace-nowrap">
                {statusTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 text-xs font-bold rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 bg-secondary text-secondary-foreground hover:bg-secondary/80 data-[state=inactive]:shadow-none">
                        {tab.label}
                        <Badge className="mr-2 text-xs bg-black/10 text-current">{tab.count}</Badge>
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
        <div className="mt-4">
            {dataLoading ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {Array.from({length: 5}).map((_, i) => <CardSkeleton key={i} />)}
                 </div>
            ) : filteredAppointments.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredAppointments.map(app => (
                        <Card key={app.id} onClick={() => handleOpenDetails(app)} className="rounded-md bg-card text-card-foreground shadow-sm flex flex-col cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm text-foreground truncate">{userMap.get(app.clientUid)?.full_name || app.clientName}</span>
                                    {getStatusBadge(app.status)}
                                </div>
                                <p className="font-mono text-xl font-black text-primary">{format(parseISO(app.appointmentDate), 'hh:mm a')}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="h-60 flex flex-col items-center justify-center gap-3 text-center">
                    <CalendarIcon className="w-16 h-16 text-gray-300" />
                    <h3 className="text-base font-bold text-gray-600">لا توجد مواعيد لعرضها</h3>
                    <p className="text-xs text-gray-400 font-bold">لا توجد طلبات مجدولة تطابق هذا الفلتر حالياً.</p>
                </div>
            )}
        </div>
      </Tabs>
      
      <Dialog open={isDetailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="p-0 max-w-lg" dir="rtl">
            <DialogHeader className="p-6 pb-0 text-right">
                <DialogTitle>تفاصيل الموعد #{selectedAppointment?.id?.slice(-6)}</DialogTitle>
                <DialogDescription>عرض وتعديل الموعد والإجراءات المتاحة.</DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
                <div className="space-y-4 px-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-1 p-3 bg-muted/50 rounded-md">
                        <h4 className="font-bold text-xs flex items-center gap-2 text-primary"><UserIcon className="w-3 h-3"/>العميل</h4>
                        <p className="font-bold text-sm text-foreground">{userMap.get(selectedAppointment.clientUid)?.full_name || selectedAppointment.clientName}</p>
                        <p className="text-xs text-muted-foreground font-mono" dir="ltr">{userMap.get(selectedAppointment.clientUid)?.phone || selectedAppointment.clientPhone}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3"/>{selectedAppointment.clientAddress}</p>
                    </div>
                    <div className="space-y-1 p-3 bg-muted/50 rounded-md">
                        <h4 className="font-bold text-xs flex items-center gap-2 text-primary"><ShoppingBag className="w-3 h-3"/>الطلب</h4>
                        <p className="font-bold text-sm">{storeMap.get(selectedAppointment.storeId)?.name_ar || selectedAppointment.storeName}</p>
                        <ul className="text-xs text-muted-foreground list-disc pr-4">
                            {selectedAppointment.items.map((item, i) => <li key={i}>{item.productName_ar} (x{item.quantity})</li>)}
                        </ul>
                        <p className="font-black pt-2 border-t mt-2 text-foreground flex items-center gap-1.5 text-sm"><Tag className="w-3 h-3 text-primary"/>{selectedAppointment.totalPrice.toLocaleString()} ر.ي - <span className="text-muted-foreground text-xs font-bold">{selectedAppointment.paymentMethod === 'wallet' ? 'محفظة' : 'عند الاستلام'}</span></p>
                    </div>

                    {isRescheduleActive && (
                        <div className="space-y-2 p-3 border rounded-md bg-background animate-in fade-in duration-300">
                             <h4 className="font-bold text-xs">إعادة جدولة الموعد</h4>
                             <div className="flex gap-2">
                                <Input type="date" value={editedDate} onChange={(e) => setEditedDate(e.target.value)} className="rounded-md"/>
                                <Input type="time" value={editedTime} onChange={(e) => setEditedTime(e.target.value)} className="rounded-md"/>
                             </div>
                             <Button onClick={handleReschedule} disabled={isSubmitting} size="sm" className="w-full rounded-md">
                                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'حفظ التوقيت الجديد'}
                             </Button>
                        </div>
                    )}
                     
                    {selectedAppointment?.history && selectedAppointment.history.length > 0 && (
                        <div className="pt-2">
                          <h4 className="font-bold mb-2 flex items-center gap-2 text-xs text-primary"><History className="w-3 h-3"/>سجل التغييرات</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                              {selectedAppointment.history.slice().reverse().map((entry, index) => (
                                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded-md">
                                      <div>
                                          <span className="font-bold">{getStatusLabel(entry.status)}</span>
                                          {entry.reason && <p className="text-xs text-muted-foreground">السبب: {entry.reason}</p>}
                                      </div>
                                      <div className="text-xs text-muted-foreground font-mono">
                                          {format(parseISO(entry.timestamp), 'dd/MM/yy hh:mm a', {locale: ar})}
                                      </div>
                                  </div>
                              ))}
                          </div>
                        </div>
                    )}

                </div>
            )}
            {selectedAppointment && 
              <DialogFooter className="p-4 bg-muted/80 border-t flex-row justify-between sm:justify-between w-full">
                  <div className="flex gap-2">
                    {selectedAppointment.status === 'scheduled' && <Button size="sm" className="rounded-md" disabled={isSubmitting} onClick={() => handleStatusUpdate(selectedAppointment.id!, 'confirmed')}><CheckCircle className="ml-1 h-4 w-4"/>تأكيد</Button>}
                    <Button size="sm" variant="outline" className="rounded-md" onClick={() => setRescheduleActive(s => !s)}>إعادة جدولة</Button>
                    <Button size="sm" variant="destructive" className="rounded-md" onClick={() => { setDetailsOpen(false); setTimeout(() => setCancelOpen(true), 150);}}>إلغاء</Button>
                  </div>
                   <DialogClose asChild><Button variant="secondary" size="sm" className="rounded-md">إغلاق</Button></DialogClose>
              </DialogFooter>
            }
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isCancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent dir="rtl">
            <AlertDialogHeader className="text-right">
                <AlertDialogTitle>تأكيد إلغاء الموعد</AlertDialogTitle>
                <AlertDialogDescription>الرجاء كتابة سبب الإلغاء. سيتم تسجيل هذا السبب في سجل الموعد.</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea placeholder="مثال: بناءً على طلب العميل..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="rounded-md"/>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => handleStatusUpdate(selectedAppointment!.id!, 'cancelled', cancelReason)} disabled={!cancelReason || isSubmitting} className="rounded-md bg-destructive hover:bg-destructive/90">
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "تأكيد الإلغاء"}
                </AlertDialogAction>
                 <AlertDialogCancel className="rounded-md">تراجع</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add this class to globals.css if it's not there to hide scrollbars elegantly
/*
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
*/
