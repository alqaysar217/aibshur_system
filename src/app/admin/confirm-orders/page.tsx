'use client';
import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, query, orderBy, updateDoc, arrayUnion, getDocs, where, writeBatch, limit } from 'firebase/firestore';
import type { Order, User, Store, OrderStatus, OrderHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, X, Check, Eye, Package, User as UserIcon, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';

const RowSkeleton = () => <TableRow><TableCell colSpan={7} className="p-0"><Skeleton className="w-full h-[60px]"/></TableCell></TableRow>;

const statusTabs: { label: string, value: OrderStatus | 'all' }[] = [
    { label: 'الكل', value: 'all' },
    { label: 'طلبات جديدة', value: 'pending' },
    { label: 'قيد التجهيز', value: 'preparing' },
    { label: 'تم التوصيل', value: 'delivered' },
    { label: 'ملغاة', value: 'cancelled' },
]

export default function ConfirmOrdersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();

  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data fetching
  const ordersQuery = useMemo(() => firestore ? query(collection(firestore, 'orders'), orderBy('created_at', 'desc'), limit(15)) : null, [firestore]);
  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const storesQuery = useMemo(() => firestore ? collection(firestore, 'stores') : null, [firestore]);

  const { data: orders, loading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery, { fetchOnce: true, collectionPath: 'orders' });
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>(usersQuery, { fetchOnce: true, collectionPath: 'users' });
  const { data: stores, loading: storesLoading, error: storesError } = useCollection<Store>(storesQuery, { fetchOnce: true, collectionPath: 'stores' });
  
  const dataLoading = ordersLoading || usersLoading || storesLoading;

  // Create maps for efficient lookups
  const userMap = useMemo(() => new Map(users?.map(u => [u.uid, u])), [users]);
  const storeMap = useMemo(() => new Map(stores?.map(s => [s.id, s])), [stores]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
        const tabMatch = activeTab === 'all' || order.status === activeTab;
        
        const client = userMap.get(order.clientUid);
        const searchTerm = searchQuery.toLowerCase();
        const searchMatch = !searchTerm ||
            order.id?.toLowerCase().includes(searchTerm) ||
            client?.full_name?.toLowerCase().includes(searchTerm) ||
            client?.phone?.includes(searchTerm);

        return tabMatch && searchMatch;
    });
  }, [orders, activeTab, searchQuery, userMap]);
  
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
        case 'pending': return <Badge className="bg-yellow-100 text-yellow-700">قيد الانتظار</Badge>;
        case 'preparing': return <Badge className="bg-blue-100 text-blue-700">قيد التجهيز</Badge>;
        case 'out_for_delivery': return <Badge className="bg-cyan-100 text-cyan-700">جاري التوصيل</Badge>;
        case 'delivered': return <Badge className="bg-green-100 text-green-700">تم التوصيل</Badge>;
        case 'cancelled':
        case 'rejected': return <Badge variant="destructive">ملغي</Badge>;
        default: return <Badge variant="secondary">غير معروف</Badge>;
    }
  }

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };
  
  const handleOpenCancel = (order: Order) => {
    setSelectedOrder(order);
    setCancelReason('');
    setCancelOpen(true);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
      if (!firestore || !adminUser) return;
      setIsSubmitting(true);
      const orderDocRef = doc(firestore, 'orders', orderId);
      
      const historyEntry: OrderHistoryItem = {
          status: newStatus,
          timestamp: new Date().toISOString(),
          updatedBy: adminUser.uid,
          ...(reason && { reason }),
      };

      try {
          await updateDoc(orderDocRef, {
              status: newStatus,
              order_history: arrayUnion(historyEntry)
          });
          toast({ title: "تم تحديث حالة الطلب بنجاح" });
          if(isCancelOpen) setCancelOpen(false);
      } catch(err: any) {
          toast({ variant: 'destructive', title: "خطأ", description: "فشل تحديث حالة الطلب" });
          if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({path: orderDocRef.path, operation: 'update'}));
          }
          console.error(err);
      } finally {
          setIsSubmitting(false);
      }
  }

  const dbError = ordersError || usersError || storesError;
  if (dbError) {
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
        return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center p-8">خطأ في جلب البيانات: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">إدارة وتأكيد الطلبات</h1>
        <p className="text-gray-400 text-sm font-bold mt-1">متابعة وقبول الطلبات الجديدة وتمريرها للمتاجر.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} dir="rtl">
        <TabsList className="grid w-full grid-cols-5">
            {statusTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
        </TabsList>
        <Card className="mt-4 border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-4 border-b border-gray-50">
                <Input 
                    placeholder="ابحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-lg"
                />
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <TableHead>رقم الطلب</TableHead>
                            <TableHead>العميل</TableHead>
                            <TableHead>المتجر</TableHead>
                            <TableHead className="text-center">الإجمالي</TableHead>
                            <TableHead className="text-center">الحالة</TableHead>
                            <TableHead className="text-center">الوقت</TableHead>
                            <TableHead className="text-center">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dataLoading ? Array.from({length: 5}).map((_, i) => <RowSkeleton key={i} />)
                        : filteredOrders.length > 0 ? filteredOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-mono text-xs">#{order.id?.slice(-6)}</TableCell>
                                <TableCell className="font-bold text-xs">{userMap.get(order.clientUid)?.full_name || '...'}</TableCell>
                                <TableCell className="font-bold text-xs">{storeMap.get(order.storeId)?.name_ar || '...'}</TableCell>
                                <TableCell className="text-center font-bold text-xs">{order.total_price.toLocaleString()} ر.ي</TableCell>
                                <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">{format(new Date(order.created_at), 'hh:mm a', {locale: ar})}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDetails(order)}><Eye className="h-4 w-4 text-gray-500"/></Button>
                                        {order.status === 'pending' && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(order.id!, 'preparing')}><Check className="h-4 w-4 text-green-500"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenCancel(order)}><X className="h-4 w-4 text-red-500"/></Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <Package className="w-16 h-16 text-gray-300" />
                                        <h3 className="text-xl font-bold text-gray-600">لا توجد طلبات في هذه الفئة بعد</h3>
                                        <p className="text-gray-400 font-bold max-w-md">
                                            {activeTab === 'pending' 
                                            ? 'للبدء في اختبار عملية تأكيد الطلبات، يمكنك استخدام أداة حقن البيانات لإضافة طلبات جديدة وهمية.'
                                            : 'لا توجد طلبات مسجلة تطابق هذا الفلتر. جرب فلتر آخر أو قم بإضافة بيانات.'
                                            }
                                        </p>
                                        {activeTab === 'pending' && (
                                            <Button asChild className="font-black gap-2 mt-2">
                                                <Link href="/admin/reports/data-seeder">
                                                    <Database className="h-4 w-4" />
                                                    الذهاب إلى أداة حقن البيانات
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>تفاصيل الطلب #{selectedOrder?.id?.slice(-6)}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-primary" />
                                <span className="font-bold">{userMap.get(selectedOrder.clientUid)?.full_name}</span>
                            </div>
                            <Badge variant="outline" className="font-mono">
                                الرصيد: {(userMap.get(selectedOrder.clientUid)?.wallet_balance || 0).toLocaleString()} ر.ي
                            </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground font-mono" dir="ltr">{userMap.get(selectedOrder.clientUid)?.phone}</div>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-bold flex items-center gap-2"><Package className="h-4 w-4 text-primary"/> محتويات السلة</h4>
                        <div className="border rounded-lg divide-y">
                            {selectedOrder.items.map(item => (
                                <div key={item.productId} className="flex justify-between items-center p-2 text-sm">
                                    <div>
                                        <span className="font-bold">{item.productName_ar}</span>
                                        {item.variantName_ar && <span className="text-muted-foreground text-xs"> ({item.variantName_ar})</span>}
                                    </div>
                                    <div className="font-mono">x{item.quantity}</div>
                                    <div className="font-bold">{(item.price * item.quantity).toLocaleString()} ر.ي</div>
                                </div>
                            ))}
                        </div>
                     </div>
                     <div className="border-t pt-2 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي:</span> <span className="font-bold">{selectedOrder.subtotal_price.toLocaleString()} ر.ي</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">رسوم التوصيل:</span> <span className="font-bold">{selectedOrder.delivery_fee.toLocaleString()} ر.ي</span></div>
                        <div className="flex justify-between font-black text-base"><span className="text-primary">الإجمالي:</span> <span>{selectedOrder.total_price.toLocaleString()} ر.ي</span></div>
                     </div>
                </div>
            )}
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">إغلاق</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
       <AlertDialog open={isCancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>تأكيد إلغاء الطلب</AlertDialogTitle>
                <AlertDialogDescription>
                    الرجاء كتابة سبب الإلغاء. سيتم إشعار العميل بذلك.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea 
                placeholder="مثال: المتجر مغلق حالياً، الصنف غير متوفر..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
            />
            <AlertDialogFooter>
                <AlertDialogCancel>تراجع</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => handleStatusUpdate(selectedOrder!.id!, 'cancelled', cancelReason)}
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
