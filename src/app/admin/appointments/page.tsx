'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc, arrayUnion, getDocs, limit } from 'firebase/firestore';
import type { Appointment, User, Store, AppointmentStatus, AppointmentHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarIcon, CheckCircle, Clock, Send, Pencil, Loader2, Info, User as UserIcon, ShoppingBag, MapPin, Tag, X, History, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isToday, isTomorrow, isThisMonth, parseISO, addHours, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CardSkeleton = () => (
    <div className="border bg-card text-card-foreground shadow-md rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-6 w-1/4" />
        </div>
        <Skeleton className="h-8 w-1/3" />
    </div>
);

const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
        case 'scheduled': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">مجدول</Badge>;
        case 'confirmed': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">مؤكد</Badge>;
        case 'dispatched': return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">مرسل للمندوب</Badge>;
        case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200">مكتمل</Badge>;
        case 'cancelled': return <Badge variant="destructive">ملغي</Badge>;
        default: return <Badge variant="secondary">غير معروف</Badge>;
    }
}

const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
        case 'scheduled': return 'مجدول';
        case 'confirmed': return 'مؤكد';
        case 'dispatched': return 'مرسل للمندوب';
        case 'completed': return 'مكتمل';
        case 'cancelled': return 'ملغي';
        default: return 'غير معروف';
    }
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const [timeFilter, setTimeFilter] = useState<'today' | 'tomorrow' | 'this_month' | 'completed'>('today');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editedDate, setEditedDate] = useState<Date | undefined>();
  const [editedTime, setEditedTime] = useState('');
  
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Data Fetching
  const appointmentsQuery = useMemo(() => firestore ? query(collection(firestore, 'appointments'), orderBy('appointmentDate', 'asc'), limit(50)) : null, [firestore, refreshKey]);
  const { data: appointments, loading: appointmentsLoading, error: appointmentsError } = useCollection<Appointment>(appointmentsQuery, {fetchOnce: true});
  
  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore, refreshKey]);
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>(usersQuery, {fetchOnce: true});

  const storesQuery = useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore, refreshKey]);
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(storesQuery, {fetchOnce: true});
  
  const dataLoading = appointmentsLoading || usersLoading || storesLoading;

  const userMap = useMemo(() => new Map(users?.map(u => [u.uid, u])), [users]);
  const storeMap = useMemo(() => new Map(stores?.map(s => [s.id, s])), [stores]);

  const { filteredAppointments, counts } = useMemo(() => {
    if (!appointments) return { filteredAppointments: [], counts: { today: 0, tomorrow: 0, this_month: 0, completed: 0 } };

    const today: Appointment[] = [];
    const tomorrow: Appointment[] = [];
    const this_month: Appointment[] = [];
    const completed: Appointment[] = [];

    appointments.forEach(app => {
        if (app.status === 'completed') {
            completed.push(app);
            return;
        }
        const appDate = parseISO(app.appointmentDate);
        if (isToday(appDate)) today.push(app);
        if (isTomorrow(appDate)) tomorrow.push(app);
        if (isThisMonth(appDate)) this_month.push(app);
    });

    const counts = {
        today: today.length,
        tomorrow: tomorrow.length,
        this_month: this_month.length,
        completed: completed.length
    }

    let filtered: Appointment[] = [];
    switch(timeFilter) {
        case 'today': filtered = today; break;
        case 'tomorrow': filtered = tomorrow; break;
        case 'this_month': filtered = this_month; break;
        case 'completed': filtered = completed; break;
    }
    
    return { 
        filteredAppointments: filtered.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()), 
        counts 
    };

  }, [appointments, timeFilter]);
  

  const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
      toast({title: "جاري تحديث البيانات..."});
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: AppointmentStatus, reason?: string) => {
      if (!firestore || !adminUser) return;
      setIsSubmitting(true);
      const appointmentDocRef = doc(firestore, 'appointments', appointmentId);
      
      const historyEntry: AppointmentHistoryItem = {
          status: newStatus,
          timestamp: new Date().toISOString(),
          updatedBy: adminUser.uid,
          ...(reason && { reason }),
      };

      try {
          await updateDoc(appointmentDocRef, { 
              status: newStatus,
              history: arrayUnion(historyEntry)
           });
          toast({ title: "تم تحديث حالة الموعد" });
          handleRefresh();
      } catch(err: any) {
          toast({ variant: 'destructive', title: "خطأ", description: "فشل تحديث حالة الموعد" });
          if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({path: appointmentDocRef.path, operation: 'update'}));
          }
          console.error(err);
      } finally {
          setIsSubmitting(false);
          if (isCancelOpen) setCancelOpen(false);
          if (isSheetOpen) setSheetOpen(false);
      }
  }

  const handleOpenSheet = (app: Appointment) => {
    setSelectedAppointment(app);
    const appointmentDate = parseISO(app.appointmentDate);
    setEditedDate(appointmentDate);
    setEditedTime(format(appointmentDate, 'HH:mm'));
    setCancelReason('');
    setSheetOpen(true);
  }

  const handleUpdateAppointment = async () => {
    if (!firestore || !selectedAppointment || !editedDate || !editedTime) return;
    setIsSubmitting(true);
    const appointmentDocRef = doc(firestore, 'appointments', selectedAppointment.id!);

    try {
        const [hours, minutes] = editedTime.split(':').map(Number);
        const newAppointmentDate = new Date(editedDate);
        newAppointmentDate.setHours(hours, minutes);

        await updateDoc(appointmentDocRef, {
            appointmentDate: newAppointmentDate.toISOString()
        });

        toast({ title: "تم تعديل الموعد بنجاح" });
        setSheetOpen(false);
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

  const statusTabs: { label: string; value: 'today' | 'tomorrow' | 'this_month' | 'completed'; count: number }[] = [
    { label: 'مواعيد اليوم', value: 'today', count: counts.today },
    { label: 'مواعيد الغد', value: 'tomorrow', count: counts.tomorrow },
    { label: 'هذا الشهر', value: 'this_month', count: counts.this_month },
    { label: 'مكتملة', value: 'completed', count: counts.completed },
];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-black text-gray-900">إدارة المواعيد والطلبات المجدولة</h1>
            <p className="text-gray-400 text-sm font-bold mt-1">تأكيد وتوزيع الطلبات المجدولة على المناديب.</p>
        </div>
        <Button onClick={handleRefresh} variant="ghost" size="icon" disabled={dataLoading}>
            <RefreshCw className={cn("h-5 w-5", dataLoading && "animate-spin")} />
        </Button>
      </div>

      <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)} dir="rtl">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-muted p-1 rounded-full h-auto">
            {statusTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-full py-2.5 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
                    {tab.label}
                    <Badge className={cn("mr-2", timeFilter === tab.value ? 'bg-background/20 text-white' : 'bg-primary/10 text-primary')}>{tab.count}</Badge>
                </TabsTrigger>
            ))}
        </TabsList>
        <div className="mt-6">
            {dataLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({length: 4}).map((_, i) => <CardSkeleton key={i} />)}
                 </div>
            ) : filteredAppointments.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAppointments.map(app => (
                        <Card key={app.id} onClick={() => handleOpenSheet(app)} className="shadow-md rounded-2xl bg-white flex flex-col cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-lg text-foreground">{userMap.get(app.clientUid)?.full_name || app.clientName}</span>
                                    {getStatusBadge(app.status)}
                                </div>
                                <p className="font-mono text-3xl font-black text-primary pt-1">{format(parseISO(app.appointmentDate), 'hh:mm a')}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
                    <CalendarIcon className="w-24 h-24 text-gray-300" />
                    <h3 className="text-xl font-bold text-gray-600">لا توجد مواعيد لعرضها</h3>
                    <p className="text-gray-400 font-bold">لا توجد طلبات مجدولة تطابق هذا الفلتر حالياً.</p>
                </div>
            )}
        </div>
      </Tabs>
      
      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full p-0">
            <SheetHeader className="p-6 border-b">
                <SheetTitle>تفاصيل الموعد</SheetTitle>
                <SheetDescription>عرض وتعديل الموعد #{selectedAppointment?.id?.slice(-6)}</SheetDescription>
            </SheetHeader>
            {selectedAppointment && (
                <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-160px)]">
                    {/* Client & Store Details */}
                    <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-bold text-sm flex items-center gap-2"><UserIcon className="w-4 h-4 text-primary"/>العميل</h4>
                        <p className="font-black text-foreground">{userMap.get(selectedAppointment.clientUid)?.full_name || selectedAppointment.clientName}</p>
                        <p className="text-xs text-muted-foreground font-mono" dir="ltr">{userMap.get(selectedAppointment.clientUid)?.phone || selectedAppointment.clientPhone}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3"/>{selectedAppointment.clientAddress}</p>
                    </div>
                    <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-bold text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary"/>الطلب</h4>
                        <p className="font-bold text-sm">{storeMap.get(selectedAppointment.storeId)?.name_ar || selectedAppointment.storeName}</p>
                        <ul className="text-xs text-muted-foreground list-disc pr-4">
                            {selectedAppointment.items.map((item, i) => <li key={i}>{item.productName_ar} (x{item.quantity})</li>)}
                        </ul>
                        <p className="font-black pt-2 border-t mt-2 text-foreground flex items-center gap-1.5"><Tag className="w-4 h-4 text-primary"/>{selectedAppointment.totalPrice.toLocaleString()} ر.ي - <span className="text-muted-foreground text-xs font-bold">{selectedAppointment.paymentMethod === 'wallet' ? 'محفظة' : 'عند الاستلام'}</span></p>
                    </div>

                     {/* Management Section */}
                    <div className="space-y-4 pt-4 border-t">
                         <h4 className="font-bold">تعديل الموعد</h4>
                         <div className="flex justify-center p-2 border rounded-xl">
                            <Calendar mode="single" selected={editedDate} onSelect={setEditedDate} className="rounded-md" disabled={(date) => date < new Date()} />
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="appointment-time">الوقت</Label>
                             <Input id="appointment-time" type="time" value={editedTime} onChange={(e) => setEditedTime(e.target.value)} />
                         </div>
                    </div>
                     
                    {/* History */}
                    <div className="pt-4 border-t">
                      <h4 className="font-bold mb-2 flex items-center gap-2"><History className="w-4 h-4 text-primary"/>سجل تغييرات الحالة</h4>
                      {selectedAppointment?.history && selectedAppointment.history.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                              {selectedAppointment.history.slice().reverse().map((entry, index) => (
                                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-md">
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
                      ) : (
                          <p className="text-sm text-muted-foreground">لا يوجد سجل لعرضه.</p>
                      )}
                  </div>

                </div>
            )}
            {selectedAppointment && 
              <SheetFooter className="p-4 bg-gray-50/80 border-t backdrop-blur-sm">
                  <div className="w-full grid grid-cols-2 gap-2">
                    <Button onClick={handleUpdateAppointment} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'حفظ تغييرات التوقيت'}
                    </Button>
                    <Button onClick={() => setSheetOpen(false)} variant="secondary">إغلاق</Button>
                    {selectedAppointment.status === 'scheduled' && <Button size="sm" disabled={isSubmitting} onClick={() => handleStatusUpdate(selectedAppointment.id!, 'confirmed')} className="col-span-2"><CheckCircle className="ml-2 h-4 w-4"/>تأكيد الحجز</Button>}
                    <Button variant="destructive" className="col-span-2" onClick={() => setCancelOpen(true)}>إلغاء الموعد</Button>
                  </div>
              </SheetFooter>
            }
        </SheetContent>
      </Sheet>
      
      <AlertDialog open={isCancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>تأكيد إلغاء الموعد</AlertDialogTitle>
                <AlertDialogDescription>الرجاء كتابة سبب الإلغاء. سيتم تسجيله في سجل الموعد.</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea 
                placeholder="مثال: بناءً على طلب العميل..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
            />
            <AlertDialogFooter>
                <AlertDialogCancel>تراجع</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => handleStatusUpdate(selectedAppointment!.id!, 'cancelled', cancelReason)}
                    disabled={!cancelReason || isSubmitting}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "تأكيد الإلغاء"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    