'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import type { Appointment, User, Store, AppointmentStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, Send, Pencil, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isToday, isTomorrow, isThisMonth, startOfMonth, endOfMonth, startOfTomorrow, endOfTomorrow, startOfDay, endOfDay, addHours, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

const RowSkeleton = () => <TableRow><TableCell colSpan={6} className="p-0"><Skeleton className="w-full h-20"/></TableCell></TableRow>;

const statusTabs: { label: string; value: 'today' | 'tomorrow' | 'this_month' | 'completed' }[] = [
    { label: 'مواعيد اليوم', value: 'today' },
    { label: 'مواعيد الغد', value: 'tomorrow' },
    { label: 'هذا الشهر', value: 'this_month' },
    { label: 'مكتملة', value: 'completed' },
];

const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
        case 'scheduled': return <Badge className="bg-yellow-100 text-yellow-700">مجدول</Badge>;
        case 'confirmed': return <Badge className="bg-blue-100 text-blue-700">مؤكد</Badge>;
        case 'dispatched': return <Badge className="bg-cyan-100 text-cyan-700">مرسل للمندوب</Badge>;
        case 'completed': return <Badge className="bg-green-100 text-green-700">مكتمل</Badge>;
        case 'cancelled': return <Badge variant="destructive">ملغي</Badge>;
        default: return <Badge variant="secondary">غير معروف</Badge>;
    }
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  const [timeFilter, setTimeFilter] = useState<'today' | 'tomorrow' | 'this_month' | 'completed'>('today');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setDetailsOpen] = useState(false);

  // --- Data Fetching ---
  const appointmentsQuery = useMemo(() => firestore ? query(collection(firestore, 'appointments'), orderBy('appointmentDate', 'asc')) : null, [firestore]);
  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const storesQuery = useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore]);

  const { data: appointments, loading: appointmentsLoading, error: appointmentsError } = useCollection<Appointment>(appointmentsQuery, 'appointments');
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>(usersQuery, 'users');
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(storesQuery, 'stores');
  
  const dataLoading = appointmentsLoading || usersLoading || storesLoading;

  const userMap = useMemo(() => new Map(users?.map(u => [u.uid, u])), [users]);
  const storeMap = useMemo(() => new Map(stores?.map(s => [s.id, s])), [stores]);

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return appointments.filter(app => isToday(new Date(app.appointmentDate)));
      case 'tomorrow':
        return appointments.filter(app => isTomorrow(new Date(app.appointmentDate)));
      case 'this_month':
        return appointments.filter(app => isThisMonth(new Date(app.appointmentDate)));
      case 'completed':
        return appointments.filter(app => app.status === 'completed');
      default:
        return appointments;
    }
  }, [appointments, timeFilter]);
  
  // --- Sound Notification ---
  // NOTE: This requires an audio file at /public/sounds/notification.mp3 to work.
  const appointmentsRef = useRef<Appointment[] | null>(null);
  const [newAppointmentSound] = useState(() => typeof Audio !== 'undefined' ? new Audio('/sounds/notification.mp3') : null);

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
  

  const handleStatusUpdate = async (appointmentId: string, newStatus: AppointmentStatus) => {
      if (!firestore || !adminUser) return;
      setIsSubmitting(true);
      const appointmentDocRef = doc(firestore, 'appointments', appointmentId);

      try {
          await updateDoc(appointmentDocRef, { status: newStatus });
          toast({ title: "تم تحديث حالة الموعد" });
      } catch(err: any) {
          toast({ variant: 'destructive', title: "خطأ", description: "فشل تحديث حالة الموعد" });
          if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({path: appointmentDocRef.path, operation: 'update'}));
          }
          console.error(err);
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
        <Card className="mt-4 border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <TableHead className="w-1/4">الموعد والعميل</TableHead>
                            <TableHead className="w-1/4">تفاصيل الطلب</TableHead>
                            <TableHead className="text-center w-1/4">الحالة</TableHead>
                            <TableHead className="text-center w-1/4">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dataLoading ? Array.from({length: 3}).map((_, i) => <RowSkeleton key={i} />)
                        : filteredAppointments.length > 0 ? filteredAppointments.map(app => {
                           const client = userMap.get(app.clientUid);
                           const store = storeMap.get(app.storeId);
                           const isDispatchable = app.status === 'confirmed' && isWithinInterval(new Date(app.appointmentDate), { start: new Date(), end: addHours(new Date(), 1) });
                           
                           return (
                            <TableRow key={app.id}>
                                <TableCell className="align-top space-y-2">
                                  <div className="font-black text-primary text-base">{format(new Date(app.appointmentDate), 'EEEE, d MMMM', {locale: ar})}</div>
                                  <div className="font-mono text-lg font-bold text-gray-800">{format(new Date(app.appointmentDate), 'hh:mm a')}</div>
                                  <div className="pt-2">
                                      <div className="font-bold text-sm">{client?.full_name || app.clientName}</div>
                                      <div className="text-xs text-muted-foreground font-mono" dir="ltr">{client?.phone || app.clientPhone}</div>
                                      <div className="text-xs text-muted-foreground">{app.clientAddress}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="font-bold text-sm">{store?.name_ar || app.storeName}</div>
                                  <ul className="text-xs text-muted-foreground list-disc pr-4 mt-1">
                                      {app.items.slice(0, 2).map(item => (
                                          <li key={item.productId}>{item.productName_ar} (x{item.quantity})</li>
                                      ))}
                                      {app.items.length > 2 && <li>... و {app.items.length - 2} أصناف أخرى</li>}
                                  </ul>
                                  <div className="font-bold mt-2 pt-2 border-t">{app.totalPrice.toLocaleString()} ر.ي - <span className="text-muted-foreground text-xs">{app.paymentMethod === 'wallet' ? 'محفظة' : 'عند الاستلام'}</span></div>
                                </TableCell>
                                <TableCell className="text-center align-middle">{getStatusBadge(app.status)}</TableCell>
                                <TableCell className="text-center align-middle space-y-2">
                                    {app.status === 'scheduled' && <Button disabled={isSubmitting} onClick={() => handleStatusUpdate(app.id!, 'confirmed')} className="w-full"><CheckCircle className="ml-2 h-4 w-4"/>تأكيد الحجز</Button>}
                                    {isDispatchable && <Button disabled={isSubmitting} onClick={() => handleStatusUpdate(app.id!, 'dispatched')} className="w-full bg-orange-500 hover:bg-orange-600"><Send className="ml-2 h-4 w-4"/>إرسال للمندوب</Button>}
                                    <Button variant="outline" className="w-full" onClick={() => {setSelectedAppointment(app); setDetailsOpen(true);}}><Pencil className="ml-2 h-4 w-4"/>تعديل</Button>
                                </TableCell>
                            </TableRow>
                        )}) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <Calendar className="w-16 h-16 text-gray-300" />
                                        <h3 className="text-xl font-bold text-gray-600">لا توجد مواعيد لعرضها</h3>
                                        <p className="text-gray-400 font-bold">لا توجد طلبات مجدولة تطابق هذا الفلتر حالياً.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </Tabs>
      
      <Dialog open={isDetailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>تعديل الموعد</DialogTitle>
                  <DialogDescription>
                      هذه الواجهة قيد التطوير حالياً. يمكنك تغيير حالة الموعد من الجدول مباشرة.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-center">
                <Info className="mx-auto h-12 w-12 text-blue-500"/>
                <p className="mt-2 font-bold">واجهة تعديل المواعيد - قيد الإنشاء</p>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button>إغلاق</Button></DialogClose>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
