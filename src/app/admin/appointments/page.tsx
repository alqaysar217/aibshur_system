'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import type { Appointment, User, Store, AppointmentStatus, AppointmentHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar as CalendarIcon, CheckCircle, Clock, Send, Pencil, Loader2, Info, User as UserIcon, ShoppingBag, MapPin, Tag, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isToday, isTomorrow, isThisMonth, startOfTomorrow, endOfTomorrow, startOfDay, endOfDay, addHours, isWithinInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CardSkeleton = () => (
    <div className="border bg-card text-card-foreground shadow-sm rounded-2xl p-6 space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex justify-between items-center pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
        </div>
    </div>
);

const statusTabs: { label: string; value: 'today' | 'tomorrow' | 'this_month' | 'completed' }[] = [
    { label: 'مواعيد اليوم', value: 'today' },
    { label: 'مواعيد الغد', value: 'tomorrow' },
    { label: 'هذا الشهر', value: 'this_month' },
    { label: 'مكتملة', value: 'completed' },
];

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

  const [timeFilter, setTimeFilter] = useState<'today' | 'tomorrow' | 'this_month' | 'completed'>('today');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editedDate, setEditedDate] = useState<Date | undefined>();
  const [editedTime, setEditedTime] = useState('');
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Data Fetching
  const appointmentsQuery = useMemo(() => firestore ? query(collection(firestore, 'appointments'), orderBy('appointmentDate', 'asc')) : null, [firestore]);
  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const storesQuery = useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore]);

  const { data: appointments, loading: appointmentsLoading, error: appointmentsError } = useCollection<Appointment>(appointmentsQuery);
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>(usersQuery);
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(storesQuery);
  
  const dataLoading = appointmentsLoading || usersLoading || storesLoading;

  const userMap = useMemo(() => new Map(users?.map(u => [u.uid, u])), [users]);
  const storeMap = useMemo(() => new Map(stores?.map(s => [s.id, s])), [stores]);

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(app => {
        if (app.status === 'completed' && timeFilter !== 'completed') return false;
        if (timeFilter === 'completed') return app.status === 'completed';

        const appDate = parseISO(app.appointmentDate);
        if (timeFilter === 'today') return isToday(appDate);
        if (timeFilter === 'tomorrow') return isTomorrow(appDate);
        if (timeFilter === 'this_month') return isThisMonth(appDate);
        
        return true;
    });
  }, [appointments, timeFilter]);
  
  const appointmentsRef = useRef<Appointment[] | null>(null);
  const newAppointmentSound = useMemo(() => typeof Audio !== 'undefined' ? new Audio('/sounds/notification.mp3') : null, []);

  useEffect(() => {
    if (newAppointmentSound && appointments && appointmentsRef.current) {
      if (appointments.length > appointmentsRef.current.length) {
        const newScheduled = appointments.filter(app => !appointmentsRef.current!.some(prev => prev.id === app.id) && app.status === 'scheduled');
        if (newScheduled.length > 0) {
          newAppointmentSound.play().catch(e => console.log("Audio playback failed. User interaction might be required."));
          toast({
            title: `موعد جديد (${newScheduled.length})`,
            description: `تم استلام موعد جديد من العميل ${newScheduled[0].clientName}`,
          });
        }
      }
    }
    appointmentsRef.current = appointments;
  }, [appointments, newAppointmentSound, toast]);
  

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
      } catch(err: any) {
          toast({ variant: 'destructive', title: "خطأ", description: "فشل تحديث حالة الموعد" });
          if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({path: appointmentDocRef.path, operation: 'update'}));
          }
          console.error(err);
      } finally {
          setIsSubmitting(false);
          if (isCancelOpen) setCancelOpen(false);
          if (isEditOpen) setEditOpen(false);
      }
  }

  const handleOpenEditDialog = (app: Appointment) => {
    setSelectedAppointment(app);
    const appointmentDate = parseISO(app.appointmentDate);
    setEditedDate(appointmentDate);
    setEditedTime(format(appointmentDate, 'HH:mm'));
    setCancelReason('');
    setEditOpen(true);
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
        setEditOpen(false);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">إدارة المواعيد والطلبات المجدولة</h1>
        <p className="text-gray-400 text-sm font-bold mt-1">تأكيد وتوزيع الطلبات المجدولة على المناديب.</p>
      </div>

      <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)} dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
            {statusTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
        </TabsList>
        <div className="mt-6">
            {dataLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({length: 3}).map((_, i) => <CardSkeleton key={i} />)}
                 </div>
            ) : filteredAppointments.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAppointments.map(app => {
                       const client = userMap.get(app.clientUid);
                       const store = storeMap.get(app.storeId);
                       const isDispatchable = app.status === 'confirmed' && isWithinInterval(parseISO(app.appointmentDate), { start: new Date(), end: addHours(new Date(), 1) });
                       
                       return (
                        <Card key={app.id} className="border-none shadow-sm rounded-2xl bg-white flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="font-black text-primary text-base">{format(parseISO(app.appointmentDate), 'EEEE, d MMMM', {locale: ar})}</div>
                                    {getStatusBadge(app.status)}
                                </div>
                                <CardTitle className="font-mono text-3xl font-bold text-gray-800 pt-1">{format(parseISO(app.appointmentDate), 'hh:mm a')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                    <h4 className="font-bold text-sm flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground"/> العميل</h4>
                                    <p className="font-bold">{client?.full_name || app.clientName}</p>
                                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{client?.phone || app.clientPhone}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3"/>{app.clientAddress}</p>
                                </div>
                                 <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                     <h4 className="font-bold text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-muted-foreground"/> الطلب</h4>
                                    <p className="font-bold text-sm">{store?.name_ar || app.storeName}</p>
                                    <p className="text-xs text-muted-foreground list-disc pr-4">
                                        {app.items.length} أصناف
                                    </p>
                                    <p className="font-bold pt-2 border-t mt-2"><Tag className="w-3 h-3 inline-block ml-1"/>{app.totalPrice.toLocaleString()} ر.ي - <span className="text-muted-foreground text-xs">{app.paymentMethod === 'wallet' ? 'محفظة' : 'عند الاستلام'}</span></p>
                                </div>
                            </CardContent>
                            <CardFooter className="p-4 bg-gray-50/50 border-t">
                                <div className="w-full flex gap-2">
                                {app.status === 'scheduled' && <Button size="sm" disabled={isSubmitting} onClick={() => handleStatusUpdate(app.id!, 'confirmed')} className="flex-1"><CheckCircle className="ml-2 h-4 w-4"/>تأكيد الحجز</Button>}
                                {isDispatchable && <Button size="sm" disabled={isSubmitting} onClick={() => handleStatusUpdate(app.id!, 'dispatched')} className="flex-1 bg-orange-500 hover:bg-orange-600"><Send className="ml-2 h-4 w-4"/>إرسال للمندوب</Button>}
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenEditDialog(app)}><Pencil className="ml-2 h-4 w-4"/>تعديل</Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )})}
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
      
      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>تعديل الموعد</DialogTitle>
                  <DialogDescription>
                      تعديل بيانات موعد العميل "{selectedAppointment?.clientName}".
                  </DialogDescription>
              </DialogHeader>
              {selectedAppointment && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                       <h4 className="font-bold">تعديل التوقيت</h4>
                       <Calendar
                            mode="single"
                            selected={editedDate}
                            onSelect={setEditedDate}
                            className="rounded-md border"
                            disabled={(date) => date < new Date()}
                        />
                         <div className="space-y-2">
                            <Label htmlFor="appointment-time">الوقت</Label>
                            <Input
                                id="appointment-time"
                                type="time"
                                value={editedTime}
                                onChange={(e) => setEditedTime(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-bold">تعديل الحالة</h4>
                        <div className="flex flex-col gap-2">
                            {['scheduled', 'confirmed', 'completed'].map((status) => (
                                <Button
                                    key={status}
                                    variant={selectedAppointment.status === status ? 'default' : 'outline'}
                                    onClick={() => handleStatusUpdate(selectedAppointment.id!, status as AppointmentStatus)}
                                >
                                    {status === 'scheduled' && 'إعادة إلى "مجدول"'}
                                    {status === 'confirmed' && 'تأكيد الموعد'}
                                    {status === 'completed' && 'تحديد كمكتمل'}
                                </Button>
                            ))}
                            <Button variant="destructive" onClick={() => setCancelOpen(true)}>إلغاء الموعد</Button>
                        </div>
                    </div>
                </div>
                 <div className="mt-6 pt-4 border-t col-span-1 md:col-span-2">
                    <h4 className="font-bold mb-2">سجل تغييرات الحالة</h4>
                    {selectedAppointment?.history && selectedAppointment.history.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
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
                </>
              )}
              <DialogFooter>
                  <Button onClick={handleUpdateAppointment} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'حفظ تغييرات التوقيت'}
                  </Button>
                  <DialogClose asChild><Button variant="secondary">إغلاق</Button></DialogClose>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
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

    